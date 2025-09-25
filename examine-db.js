const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function examineDatabase() {
  console.log('=== DATABASE EXAMINATION ===\n');
  
  try {
    // Get all table names
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`;
    
    console.log('📋 Tables in database:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    console.log('');
    
    // Examine each table
    for (const tableInfo of tables) {
      const tableName = tableInfo.name;
      console.log(`\n🔍 TABLE: ${tableName}`);
      console.log('='.repeat(50));
      
      // Get schema
      const schema = await prisma.$queryRaw`PRAGMA table_info(${tableName})`;
      
      console.log('📊 Schema:');
      schema.forEach(column => {
        console.log(`  ${column.name} (${column.type})${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ` DEFAULT ${column.dflt_value}` : ''}`);
      });
      console.log('');
      
      // Get row count
      const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${tableName}`;
      const rowCount = countResult[0].count;
      console.log(`📈 Row count: ${rowCount}`);
      
      if (rowCount > 0) {
        // Get sample data (first 3 rows)
        const sampleData = await prisma.$queryRaw(`SELECT * FROM ${tableName} LIMIT 3`);
        
        console.log('\n📋 Sample data:');
        sampleData.forEach((row, index) => {
          console.log(`  Row ${index + 1}:`);
          Object.keys(row).forEach(key => {
            const value = row[key];
            const displayValue = value === null ? 'NULL' : 
                              typeof value === 'string' && value.length > 50 ? 
                              value.substring(0, 50) + '...' : value;
            console.log(`    ${key}: ${displayValue}`);
          });
          console.log('');
        });
      }
      
      console.log('\n' + '='.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error examining database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

examineDatabase().catch(console.error);