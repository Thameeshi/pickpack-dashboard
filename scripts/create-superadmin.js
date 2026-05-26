/**
 * Bootstrap Script: Create First Super Admin
 * 
 * Usage: node scripts/create-superadmin.js <email> <password> <name> <phone>
 * Example: node scripts/create-superadmin.js admin@pickpack.com Password123! "Admin User" "+1234567890"
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = join(process.cwd(), '../pickpaack-new/firebase-adminsdk.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com', // Update with your project ID
});

const db = admin.firestore();
const auth = admin.auth();

async function createSuperAdmin(email, password, name, phone) {
  try {
    console.log('Creating super admin user...');

    // Step 1: Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    console.log(`✓ Firebase Auth user created: ${userRecord.uid}`);

    // Step 2: Create user profile in Firestore
    const now = new Date().toISOString();
    const userProfile = {
      uid: userRecord.uid,
      email,
      name,
      displayName: name,
      phone,
      role: 'superadmin',
      status: 'approved',
      language: 'en',
      createdAt: now,
      approvedAt: now,
      approvedBy: 'bootstrap-script',
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);

    console.log(`✓ Firestore user profile created`);
    console.log('\n✓ Super Admin Created Successfully!');
    console.log('\nCredentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  UID: ${userRecord.uid}`);
    console.log('\nYou can now log in to the dashboard at:');
    console.log('  http://localhost:5174/login');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating super admin:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.error('  The email already exists. Use a different email or manually update the role in Firebase Console.');
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: node scripts/create-superadmin.js <email> <password> <name> <phone>');
  console.log('Example: node scripts/create-superadmin.js admin@pickpack.com Password123! "Admin User" "+1234567890"');
  process.exit(1);
}

const [email, password, name, phone] = args;

createSuperAdmin(email, password, name, phone);
