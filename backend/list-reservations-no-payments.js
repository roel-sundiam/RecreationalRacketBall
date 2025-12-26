const mongoose = require('mongoose');
require('dotenv').config();

async function listReservationsWithoutPayments() {
  let currentConn = null;
  let prodConn = null;

  try {
    // Connect to current database
    currentConn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
    console.log('✅ Connected to current database\n');

    // Connect to production database if URI is provided
    const hasProdDb = process.env.MONGODB_URI_PROD && process.env.MONGODB_URI_PROD !== process.env.MONGODB_URI;
    if (hasProdDb) {
      prodConn = await mongoose.createConnection(process.env.MONGODB_URI_PROD).asPromise();
      console.log('✅ Connected to production database\n');
    }

    // Load models for current database
    const Reservation = require('./dist/models/Reservation').default;
    const Payment = require('./dist/models/Payment').default;
    const User = require('./dist/models/User').default;

    const ReservationModel = currentConn.model('Reservation', Reservation.schema);
    const PaymentModel = currentConn.model('Payment', Payment.schema);
    const UserModel = currentConn.model('User', User.schema);

    // Load models for production database if available
    let ProdReservationModel, ProdPaymentModel, ProdUserModel;
    if (hasProdDb) {
      ProdReservationModel = prodConn.model('Reservation', Reservation.schema);
      ProdPaymentModel = prodConn.model('Payment', Payment.schema);
      ProdUserModel = prodConn.model('User', User.schema);
    }

    // Find Super Administrator user to exclude
    const superAdmin = await UserModel.findOne({ username: 'superadmin' });

    // Find only pending reservations (exclude cancelled, no-show, confirmed, completed, and Super Administrator)
    const query = {
      status: 'pending'
    };

    if (superAdmin) {
      query.userId = { $ne: superAdmin._id };
    }

    const reservations = await ReservationModel.find(query).sort({ date: -1 });

    console.log(`📊 Total pending reservations (excluding Super Administrator): ${reservations.length}\n`);

    let noPaymentCount = 0;
    const noPaymentList = [];

    for (const reservation of reservations) {
      // Check if any payments exist for this reservation in current database
      const paymentsCount = await PaymentModel.countDocuments({
        reservationId: reservation._id
      });

      if (paymentsCount === 0) {
        noPaymentCount++;

        // Get reserver info from current database
        const reserver = await UserModel.findById(reservation.userId);

        const reservationInfo = {
          reservationId: reservation._id.toString(),
          date: reservation.date,
          timeSlot: `${reservation.timeSlot}:00 - ${reservation.endTimeSlot || (reservation.timeSlot + 1)}:00`,
          status: reservation.status,
          paymentStatus: reservation.paymentStatus,
          totalFee: reservation.totalFee,
          reserver: reserver ? `${reserver.fullName} (@${reserver.username})` : 'Unknown',
          reserverUsername: reserver ? reserver.username : null,
          players: reservation.players || [],
          createdAt: reservation.createdAt,
          prodStatus: null,
          prodPaymentCount: null
        };

        // Check production database if available
        if (hasProdDb && reserver) {
          // Find matching user in production
          const prodUser = await ProdUserModel.findOne({ username: reserver.username });

          if (prodUser) {
            // Find matching reservation in production by date, timeSlot, and userId
            const prodReservation = await ProdReservationModel.findOne({
              userId: prodUser._id,
              date: reservation.date,
              timeSlot: reservation.timeSlot
            });

            if (prodReservation) {
              // Check if production reservation has payments
              const prodPaymentCount = await ProdPaymentModel.countDocuments({
                reservationId: prodReservation._id
              });

              reservationInfo.prodStatus = prodReservation.status;
              reservationInfo.prodPaymentCount = prodPaymentCount;
            } else {
              reservationInfo.prodStatus = 'NOT FOUND';
            }
          } else {
            reservationInfo.prodStatus = 'USER NOT FOUND';
          }
        }

        noPaymentList.push(reservationInfo);
      }
    }

    console.log(`\n🔍 RESERVATIONS WITHOUT PAYMENT RECORDS: ${noPaymentCount}\n`);

    if (noPaymentList.length === 0) {
      console.log('✅ All reservations have payment records!\n');
    } else {
      noPaymentList.forEach((res, index) => {
        let line = `${index + 1}. ${res.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | ${res.timeSlot} | ${res.reserver} | ₱${res.totalFee}`;

        if (hasProdDb) {
          if (res.prodStatus === 'NOT FOUND') {
            line += ' | 🔴 Not in Prod';
          } else if (res.prodStatus === 'USER NOT FOUND') {
            line += ' | ⚠️ User not in Prod';
          } else if (res.prodPaymentCount > 0) {
            line += ` | ✅ Prod: ${res.prodStatus} (${res.prodPaymentCount} payment${res.prodPaymentCount > 1 ? 's' : ''})`;
          } else {
            line += ` | ⚠️ Prod: ${res.prodStatus} (no payments)`;
          }
        }

        console.log(line);
      });
    }

    if (currentConn) await currentConn.close();
    if (prodConn) await prodConn.close();
    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    if (currentConn) await currentConn.close();
    if (prodConn) await prodConn.close();
    process.exit(1);
  }
}

listReservationsWithoutPayments();
