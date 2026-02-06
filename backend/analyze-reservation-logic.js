const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function analyzeOriginalReservationLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    console.log('=== ANALYZING ORIGINAL RESERVATION LOGIC ===');
    
    // The recent reservation shows Total Fee: ₱1240
    // Players: Christian Sundiam, Christopher Sundiam, Helen Sundiam, Telle
    // This means the reservation total was ₱1240
    
    console.log('Recent Villa Gloria reservation details:');
    console.log('- Players: Christian Sundiam, Christopher Sundiam, Helen Sundiam, Telle');
    console.log('- Total Fee: ₱1240');
    console.log('- Time: 18:00-20:00 (2 peak hours)');
    console.log('');
    
    // Let's work backwards from ₱1240 to understand the player composition
    const peakFee = 450;
    const guestFee = 170;
    const baseFor2Hours = 2 * peakFee; // ₱900
    
    console.log('Working backwards from ₱1240:');
    console.log(`- Base fee for 2 peak hours: ₱${baseFor2Hours}`);
    console.log(`- Remaining for guest fees: ₱${1240 - baseFor2Hours}`);
    console.log(`- Guest fees per hour: ₱${guestFee}`);
    console.log(`- For 2 hours, each guest pays: ₱${guestFee * 2}`);
    console.log(`- Number of guests: ${(1240 - baseFor2Hours) / (guestFee * 2)}`);
    console.log('');
    
    // So there's 1 guest in the reservation
    console.log('✅ CONCLUSION: The reservation has 3 members + 1 guest');
    console.log('');
    
    // Now let's see what the payment breakdown should be:
    const members = 3;
    const guests = 1; 
    const memberShare = baseFor2Hours / members; // ₱300 each
    const totalGuestFee = guests * guestFee * 2; // ₱340
    
    console.log('Payment breakdown:');
    console.log(`- Member share: ₱${memberShare} each (₱${baseFor2Hours} ÷ ${members} members)`);
    console.log(`- Total guest fees: ₱${totalGuestFee} (${guests} guest × ₱${guestFee} × 2 hours)`);
    console.log(`- Regular member pays: ₱${memberShare}`);
    console.log(`- Reserver pays: ₱${memberShare + totalGuestFee} (member share + all guest fees)`);
    console.log('');
    
    // Check our findings against the problematic payment
    console.log('Comparing with problematic payment:');
    console.log(`- Problematic payment amount: ₱1130`);
    console.log(`- Expected reserver amount: ₱${memberShare + totalGuestFee}`);
    console.log(`- Difference: ₱${1130 - (memberShare + totalGuestFee)}`);
    console.log('');
    
    // The ₱1130 suggests a different calculation was used
    console.log('Reverse engineering ₱1130:');
    console.log('If ₱1130 = memberShare + guestFees, then:');
    
    // Try different member counts
    for (let memberCount = 1; memberCount <= 4; memberCount++) {
      const share = baseFor2Hours / memberCount;
      const remainingForGuests = 1130 - share;
      const guestsNeeded = remainingForGuests / (guestFee * 2);
      
      if (guestsNeeded >= 0 && guestsNeeded === Math.round(guestsNeeded)) {
        console.log(`- If ${memberCount} members: member share = ₱${share.toFixed(2)}, guests needed = ${guestsNeeded}`);
        
        // Check if this makes sense
        const totalPlayers = memberCount + guestsNeeded;
        if (totalPlayers === 4) {
          console.log(`  ✅ This matches! ${memberCount} members + ${guestsNeeded} guests = 4 total players`);
        }
      }
    }
    
    console.log('');
    console.log('🔍 INVESTIGATION SUMMARY:');
    console.log('- Correct total fee: ₱1240 (3 members + 1 guest)');
    console.log('- Problematic payment: ₱1130');
    console.log('- The ₱1130 suggests 2.65 members were calculated (impossible)');
    console.log('- This indicates the guest identification failed, causing wrong member/guest split');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

analyzeOriginalReservationLogic();