#!/usr/bin/env node

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { users } from './shared/schema.ts';

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful!');
    console.log('📅 Current database time:', result[0].current_time);
    
    // Test if tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available tables:');
    tablesResult.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Test user table specifically
    try {
      await db.select({ id: users.id }).from(users).limit(1);
      console.log(`\n👥 Successfully queried the 'users' table.`);
    } catch (err) {
      console.log('\n⚠️  Could not query the "users" table. Did you run the migration SQL from supabase-migration.sql?');
      console.error(err.message);
    }
    
    console.log('\n🎉 Database test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure you are using the "Transaction pooler" URL from Supabase for IPv4 networks.');
    console.log('2. Check your DATABASE_URL in .env file.');
    console.log('3. Ensure your Supabase project is active and not paused.');
    console.log('4. Verify your database password is correct.');
    console.log('5. Check your network connectivity and firewall settings.');
    process.exit(1);
  }
}

testDatabaseConnection();
