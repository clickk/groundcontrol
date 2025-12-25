const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  try {
    const email = 'chris@clickk.com.au';
    const password = 'test';
    const name = 'Chris';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('User already exists with email:', email);
      console.log('User details:', {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      });
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    console.log('User created successfully!');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('ID:', user.id);
    console.log('\nYou can now login with:');
    console.log('Email: chris@clickk.com.au');
    console.log('Password: test');
  } catch (error) {
    console.error('Error creating user:', error.message);
    if (error.message.includes('Can\'t reach database')) {
      console.error('\nPlease make sure:');
      console.error('1. PostgreSQL is running');
      console.error('2. DATABASE_URL in .env is correct');
      console.error('3. Database "clickk" exists');
      console.error('\nYou can create the database with:');
      console.error('createdb clickk');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

