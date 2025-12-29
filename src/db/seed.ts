import { db, schema } from './index.js';
import { hashPassword } from '../lib/password.js';
import 'dotenv/config';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await hashPassword('AdminPassword123!');

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: 'admin@fractionate.com',
      passwordHash: adminPasswordHash,
      displayName: 'Thomas (Admin)',
      role: 'admin',
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log('Created admin user:', adminUser.email);
  }

  // Create sample client
  const [sampleClient] = await db
    .insert(schema.clients)
    .values({
      name: 'Acme Corporation',
      description: 'A sample client for demonstration',
      contactName: 'John Doe',
      contactEmail: 'john@acme.com',
      industry: 'Technology',
    })
    .onConflictDoNothing()
    .returning();

  if (sampleClient) {
    console.log('Created sample client:', sampleClient.name);

    // Create sample project
    const [sampleProject] = await db
      .insert(schema.projects)
      .values({
        clientId: sampleClient.id,
        name: 'Acme Platform Redesign',
        description: 'Complete platform redesign with modern stack',
        stage: 'discovery',
        overview: {
          problem: 'Legacy platform is slow and difficult to maintain',
          goals: ['Improve performance by 50%', 'Modernize UI/UX', 'Enable mobile support'],
          nonGoals: ['Complete rewrite from scratch'],
          successCriteria: ['Sub-200ms page loads', 'Mobile responsive', '95% uptime'],
        },
        tags: ['web', 'redesign', 'modernization'],
      })
      .onConflictDoNothing()
      .returning();

    if (sampleProject) {
      console.log('Created sample project:', sampleProject.name);
    }
  }

  console.log('Seeding completed');
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
