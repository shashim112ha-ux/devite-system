const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.jvarvoyfedfsgbgsyktm:Sh990405940%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync('schema.sql', 'utf8');
  console.log('Executing SQL (length: ' + sql.length + ')...');
  await client.query(sql);
  console.log('Done!');
  await client.end();
}
run().catch(console.error);
