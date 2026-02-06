const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function findOriginalReservation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Find Villa Gloria club
    const villaGloria = await db.collection('clubs').findOne({
      name: { $regex: 'Villa Gloria', $options: 'i' }
    });
    
    console.log('=== FINDING ORIGINAL RESERVATION DATA ===');
    
    // Get the ₱1130 payment
    const payment1130 = await db.collection('payments').findOne({
      clubId: villaGloria._id,
      amount: 1130,
      status: 'pending'
    });
    
    console.log('Payment details:');
    console.log('  Reservation ID:', payment1130.reservationId);
    console.log('  Amount:', payment1130.amount);
    console.log('  Description:', payment1130.description);
    
    // Try to find the reservation by ID
    if (payment1130.reservationId) {
      const reservation = await db.collection('reservations').findOne({
        _id: payment1130.reservationId
      });
      
      if (reservation) {
        console.log('\n=== FOUND ORIGINAL RESERVATION ===');
        console.log('Reservation ID:', reservation._id);
        console.log('Date:', reservation.date);
        console.log('Time Slot:', reservation.timeSlot);
        console.log('End Time Slot:', reservation.endTimeSlot);
        console.log('Duration:', reservation.duration);
        console.log('Total Fee:', reservation.totalFee);
        console.log('Players:', reservation.players);
        console.log('Payment Status:', reservation.paymentStatus);
        
        // Analyze players
        let members = 0;
        let guests = 0;
        let customPlayers = 0;
        
        reservation.players.forEach(player => {
          if (typeof player === 'string') {
            customPlayers++;
            console.log('  Custom Player:', player);
          } else if (player.isMember) {
            members++;
            console.log('  Member:', player.name || player);
          } else if (player.isGuest) {
            guests++;
            console.log('  Guest:', player.name || player);
          }
        });
        
        console.log(`\nPlayer breakdown: ${members} members, ${guests} guests, ${customPlayers} custom players`);
        
        // Calculate what the fee SHOULD be
        const startHour = reservation.timeSlot;
        const endHour = reservation.endTimeSlot || (reservation.timeSlot + (reservation.duration || 1));
        const duration = endHour - startHour;
        
        console.log(`\n=== CORRECT FEE CALCULATION ===`);
        console.log(`Time: ${startHour}:00 - ${endHour}:00 (${duration} hours)`);
        
        const peakHours = [18, 19];
        const peakFee = 450;
        const offPeakFee = 320;
        const guestFee = 170;
        
        let totalBaseFee = 0;
        for (let hour = startHour; hour < endHour; hour++) {
          const isPeak = peakHours.includes(hour);
          const hourFee = isPeak ? peakFee : offPeakFee;
          totalBaseFee += hourFee;
          console.log(`  Hour ${hour}:00-${hour+1}:00: ${isPeak ? 'PEAK' : 'OFF-PEAK'} = ₱${hourFee}`);
        }
        
        // For custom players, we need to assume they are members or guests
        // Let's check the total player count and make reasonable assumptions
        const totalPlayers = reservation.players.length;
        
        console.log(`\nTotal base fee: ₱${totalBaseFee}`);
        
        // Different scenarios based on player types
        console.log('\n=== POSSIBLE SCENARIOS ===');
        
        // Scenario 1: All players are members (split base fee equally)
        if (members + customPlayers > 0) {
          const memberCount = members + customPlayers;
          const memberShare = totalBaseFee / memberCount;
          const totalGuestFee = guests * guestFee * duration;
          const reserverTotal = memberShare + totalGuestFee;
          
          console.log(`Scenario 1 - All ${memberCount} playing members:`);
          console.log(`  Member share: ₱${memberShare.toFixed(2)} (₱${totalBaseFee} ÷ ${memberCount})`);
          console.log(`  Guest fees: ₱${totalGuestFee} (${guests} guests × ₱${guestFee} × ${duration}h)`);
          console.log(`  Reserver pays: ₱${reserverTotal.toFixed(2)} (member share + all guest fees)`);
        }
        
        // Scenario 2: Some custom players are guests
        const possibleGuests = Math.min(customPlayers, 2); // Assume max 2 custom players are guests
        if (possibleGuests > 0) {
          const actualMembers = members + (customPlayers - possibleGuests);
          const actualGuests = guests + possibleGuests;
          
          if (actualMembers > 0) {
            const memberShare = totalBaseFee / actualMembers;
            const totalGuestFee = actualGuests * guestFee * duration;
            const reserverTotal = memberShare + totalGuestFee;
            
            console.log(`Scenario 2 - ${actualMembers} members + ${actualGuests} guests:`);
            console.log(`  Member share: ₱${memberShare.toFixed(2)} (₱${totalBaseFee} ÷ ${actualMembers})`);
            console.log(`  Guest fees: ₱${totalGuestFee} (${actualGuests} guests × ₱${guestFee} × ${duration}h)`);
            console.log(`  Reserver pays: ₱${reserverTotal.toFixed(2)} (member share + all guest fees)`);
            
            // Check if this matches any expected values
            if (Math.abs(reserverTotal - 1130) < 1) {
              console.log('  ✅ This matches current payment of ₱1130');
            }
            if (Math.abs(reserverTotal - 1240) < 1) {
              console.log('  ✅ This matches expected payment of ₱1240');
            }
          }
        }
        
      } else {
        console.log('❌ Original reservation not found - it may have been deleted');
      }
    }
    
    // Also check recent reservations for Villa Gloria to see typical patterns
    console.log('\n=== RECENT VILLA GLORIA RESERVATIONS ===');
    const recentReservations = await db.collection('reservations').find({
      clubId: villaGloria._id,
      date: { $gte: new Date('2026-02-01') }
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    recentReservations.forEach((res, index) => {
      console.log(`\nReservation ${index + 1}:`);
      console.log(`  Date: ${res.date}`);
      console.log(`  Time: ${res.timeSlot}:00-${res.endTimeSlot || res.timeSlot + 1}:00`);
      console.log(`  Players: ${res.players.length} - ${res.players.map(p => typeof p === 'string' ? p : (p.name || 'Member')).join(', ')}`);
      console.log(`  Total Fee: ₱${res.totalFee}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

findOriginalReservation();