const emptyString = '';

console.log('Empty string:', emptyString);
console.log('emptyString?.trim():', emptyString?.trim());
console.log('!emptyString?.trim():', !emptyString?.trim());
console.log('Boolean(emptyString?.trim()):', Boolean(emptyString?.trim()));

// Correct check
if (emptyString && emptyString.trim()) {
  console.log('✅ Has value (this should NOT print)');
} else {
  console.log('❌ Empty or whitespace');
}

// Current backend check
if (!emptyString?.trim()) {
  console.log('✅ Condition passes - should populate');
}
