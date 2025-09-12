/**
 * Script to update existing products that don't have royaltyPoints set
 * Run with: npx ts-node scripts/update-royalty-points.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating products without royaltyPoints...');

  // Find all products with royaltyPoints = 0 or null
  const productsToUpdate = await prisma.product.findMany({
    where: {
      OR: [
        { royaltyPoints: 0 },
        { royaltyPoints: null as any },
      ],
    },
    select: { id: true, name: true, royaltyPoints: true },
  });

  console.log(`Found ${productsToUpdate.length} products to update:`);
  productsToUpdate.forEach((p) => {
    console.log(`  - ${p.name}: ${p.royaltyPoints} pts`);
  });

  if (productsToUpdate.length === 0) {
    console.log('All products already have royaltyPoints set!');
    return;
  }

  // Update all to default 50 points
  const result = await prisma.product.updateMany({
    where: {
      OR: [
        { royaltyPoints: 0 },
        { royaltyPoints: null as any },
      ],
    },
    data: {
      royaltyPoints: 50,
    },
  });

  console.log(`Updated ${result.count} products to have 50 royaltyPoints`);

  // Verify
  const allProducts = await prisma.product.findMany({
    select: { name: true, royaltyPoints: true },
  });

  console.log('\nCurrent product royaltyPoints:');
  allProducts.forEach((p) => {
    console.log(`  - ${p.name}: ${p.royaltyPoints} pts`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
