const mongoose = require('mongoose');
require('dotenv').config();

async function updateOldReservations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Reservation = require('./dist/models/Reservation').default;
    const Payment = require('./dist/models/Payment').default;
    const User = require('./dist/models/User').default;
    const ClubSettings = require('./dist/models/ClubSettings').default;

    const user = await User.findOne({ username: 'christellesundiam' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`\n🔍 Finding old-format reservations for ${user.fullName}`);

    const reservations = await Reservation.find({
      userId: user._id.toString(),
      status: { $in: ['pending', 'confirmed'] }
    }).sort({ date: -1 });

    console.log(`\n📋 Found ${reservations.length} active reservations`);

    for (const reservation of reservations) {
      console.log(`\n📅 ${reservation.date.toISOString().split('T')[0]} ${reservation.timeSlot}:00`);
      
      // Check if old format (strings)
      const isOldFormat = reservation.players.length > 0 && typeof reservation.players[0] === 'string';
      
      if (!isOldFormat) {
        console.log('   ✅ Already new format, skipping');
        continue;
      }

      console.log('   🔄 Converting from old format to new format');
      console.log('   Old players:', reservation.players);

      // Convert string players to new format
      const newPlayers = reservation.players.map((playerName, index) => ({
        name: playerName,
        userId: index === 0 ? user._id.toString() : null, // First player is the reserver
        isMember: true,
        isGuest: false
      }));

      reservation.players = newPlayers;
      console.log('   New players:', newPlayers.map(p => p.name));

      // Get club settings for pricing
      const settings = await ClubSettings.findOne({ clubId: reservation.clubId });
      const pricing = settings?.pricing || {
        pricingModel: 'variable',
        peakHourFee: 100,
        offPeakHourFee: 75,
        fixedHourlyFee: 125,
        fixedDailyFee: 500,
        guestFee: 50,
        peakHours: [5, 18, 19, 20, 21]
      };

      const members = newPlayers.filter(p => p.isMember);
      const guests = newPlayers.filter(p => p.isGuest);

      const pricingModel = pricing.pricingModel || 'variable';
      const calculatedEndTimeSlot = reservation.endTimeSlot || (reservation.timeSlot + (reservation.duration || 1));
      const durationHours = calculatedEndTimeSlot - reservation.timeSlot;

      let totalBaseFee = 0;
      let totalGuestFee = 0;
      let memberShare = 0;

      if (pricingModel === 'fixed-daily') {
        totalBaseFee = pricing.fixedDailyFee * members.length;
        totalGuestFee = guests.length * pricing.guestFee;
        memberShare = pricing.fixedDailyFee;
      } else if (pricingModel === 'fixed-hourly') {
        totalBaseFee = pricing.fixedHourlyFee * durationHours;
        totalGuestFee = guests.length * pricing.guestFee * durationHours;
        memberShare = totalBaseFee / members.length;
      } else {
        for (let hour = reservation.timeSlot; hour < calculatedEndTimeSlot; hour++) {
          const isPeakHour = pricing.peakHours.includes(hour);
          totalBaseFee += isPeakHour ? pricing.peakHourFee : pricing.offPeakHourFee;
          totalGuestFee += guests.length * pricing.guestFee;
        }
        memberShare = totalBaseFee / members.length;
      }

      console.log(`   💰 Pricing: ${pricingModel}, Base: ₱${totalBaseFee}, Member share: ₱${memberShare}`);

      const reserverId = reservation.userId.toString();
      const reservationStartOfDay = new Date(reservation.date);
      reservationStartOfDay.setHours(0, 0, 0, 0);
      const reservationEndOfDay = new Date(reservation.date);
      reservationEndOfDay.setHours(23, 59, 59, 999);

      const paymentIds = [];

      for (const member of members) {
        const isReserver = member.userId === reserverId;

        let baseAmount = memberShare;
        let alreadyPaidDaily = false;

        if (pricingModel === 'fixed-daily') {
          const existingDailyPayment = await Payment.findOne({
            clubId: reservation.clubId,
            userId: member.userId,
            paymentType: 'court_usage',
            status: { $in: ['pending', 'completed', 'record'] },
            'metadata.date': { $gte: reservationStartOfDay, $lte: reservationEndOfDay }
          });

          if (existingDailyPayment) {
            alreadyPaidDaily = true;
            baseAmount = 0;
          }
        }

        const guestFeeForReserver = (pricingModel === 'fixed-daily' && alreadyPaidDaily) ? 0 : totalGuestFee;
        const paymentAmount = baseAmount + (isReserver ? guestFeeForReserver : 0);
        const paymentStatus = paymentAmount === 0 ? 'record' : 'pending';

        const paymentDueDate = new Date(reservation.date);
        paymentDueDate.setDate(paymentDueDate.getDate() + 1);
        paymentDueDate.setHours(23, 59, 59, 999);

        const payment = new Payment({
          clubId: reservation.clubId,
          userId: member.userId || user._id.toString(), // Use reserver's ID if member has no userId
          reservationId: reservation._id,
          amount: Math.round(paymentAmount * 100) / 100,
          currency: 'PHP',
          paymentMethod: 'cash',
          status: paymentStatus,
          dueDate: paymentDueDate,
          description: pricingModel === 'fixed-daily' && alreadyPaidDaily
            ? `Court reservation (Daily fee already covered) - ${reservation.date.toDateString()} ${reservation.timeSlot}:00-${calculatedEndTimeSlot}:00`
            : `Court reservation ${isReserver ? '(Reserver)' : ''} - ${reservation.date.toDateString()} ${reservation.timeSlot}:00-${calculatedEndTimeSlot}:00`,
          paymentDate: paymentStatus === 'record' ? new Date() : undefined,
          paymentType: 'court_usage',
          metadata: {
            timeSlot: reservation.timeSlot,
            date: reservation.date,
            playerCount: newPlayers.length,
            memberCount: members.length,
            guestCount: guests.length,
            isReserver: isReserver,
            memberShare: Math.round(memberShare * 100) / 100,
            guestFees: isReserver ? Math.round(totalGuestFee * 100) / 100 : 0
          }
        });

        await payment.save();
        paymentIds.push(payment._id.toString());
        console.log(`   💳 Created payment: ₱${paymentAmount} (${paymentStatus}) for ${member.name || 'member'}`);
      }

      // Update reservation
      reservation.paymentIds = paymentIds;
      const allPaid = paymentIds.length > 0 && (await Payment.countDocuments({ 
        _id: { $in: paymentIds }, 
        status: 'pending' 
      })) === 0;
      
      if (allPaid) {
        reservation.paymentStatus = 'paid';
      }
      
      await reservation.save({ validateBeforeSave: false });
      console.log(`   ✅ Updated reservation with ${paymentIds.length} payments`);
    }

    console.log('\n✅ Done! Reservations updated to new format with payments created.');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateOldReservations();
