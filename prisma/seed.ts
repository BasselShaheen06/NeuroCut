import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create a Coach
  const coachUser = await prisma.user.upsert({
    where: { email: 'coach@clinic.com' },
    update: {},
    create: {
      email: 'coach@clinic.com',
      passwordHash,
      role: 'COACH',
    },
  })

  // 2. Create a Player
  const playerUser = await prisma.user.upsert({
    where: { email: 'player@team.com' },
    update: {},
    create: {
      email: 'player@team.com',
      passwordHash,
      role: 'PLAYER',
    },
  })

  // 3. Create the Player's Profile (linked to the Coach)
  await prisma.player.upsert({
    where: { userId: playerUser.id },
    update: {},
    create: {
      userId: playerUser.id,
      coachId: coachUser.id,
      sport: 'Handball',
      trialCount: 5,
    },
  })

  console.log('Database seeded successfully! 🌱')
  console.log('---')
  console.log('Coach Login: coach@clinic.com | Pass: password123')
  console.log('Player Login: player@team.com | Pass: password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })