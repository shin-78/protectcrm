import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create master user
  const masterPassword = await bcrypt.hash('master123', 12);
  const master = await prisma.user.upsert({
    where: { email: 'master@protectcrm.com' },
    update: {},
    create: {
      name: 'Admin Master',
      email: 'master@protectcrm.com',
      password: masterPassword,
      role: 'MASTER',
      phone: '5511999999999',
    },
  });

  // Create supervisor
  const supervisorPassword = await bcrypt.hash('supervisor123', 12);
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@protectcrm.com' },
    update: {},
    create: {
      name: 'Carlos Supervisor',
      email: 'supervisor@protectcrm.com',
      password: supervisorPassword,
      role: 'SUPERVISOR',
      phone: '5511988888888',
    },
  });

  // Create operators
  const opPassword = await bcrypt.hash('operator123', 12);
  const operator1 = await prisma.user.upsert({
    where: { email: 'joao@protectcrm.com' },
    update: {},
    create: {
      name: 'João Operador',
      email: 'joao@protectcrm.com',
      password: opPassword,
      role: 'OPERATOR',
      phone: '5511977777777',
    },
  });

  const operator2 = await prisma.user.upsert({
    where: { email: 'ana@protectcrm.com' },
    update: {},
    create: {
      name: 'Ana Operadora',
      email: 'ana@protectcrm.com',
      password: opPassword,
      role: 'OPERATOR',
      phone: '5511966666666',
    },
  });

  // Create default pipeline
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'default-pipeline' },
    update: {},
    create: {
      id: 'default-pipeline',
      name: 'Pipeline Principal',
      description: 'Pipeline comercial padrão',
      isDefault: true,
      stages: {
        create: [
          { name: 'Novo Lead', color: '#6366f1', order: 1 },
          { name: 'Em Atendimento', color: '#f59e0b', order: 2 },
          { name: 'Proposta', color: '#3b82f6', order: 3 },
          { name: 'Negociação', color: '#8b5cf6', order: 4 },
          { name: 'Fechado', color: '#10b981', order: 5 },
          { name: 'Perdido', color: '#ef4444', order: 6 },
        ],
      },
    },
    include: { stages: true },
  });

  // Create sample leads
  const stages = pipeline.stages;
  const sampleLeads = [
    { name: 'Maria Santos', phone: '5511912345678', email: 'maria@empresa.com', company: 'Tech Corp', value: 5000, stageIdx: 0 },
    { name: 'Pedro Oliveira', phone: '5511923456789', email: 'pedro@startupx.com', company: 'Startup X', value: 12000, stageIdx: 1 },
    { name: 'Fernanda Costa', phone: '5511934567890', email: 'fernanda@retail.com', company: 'Retail SA', value: 8500, stageIdx: 2 },
    { name: 'Ricardo Lima', phone: '5511945678901', email: 'ricardo@indústria.com', company: 'Indústria ABC', value: 25000, stageIdx: 3 },
    { name: 'Juliana Rocha', phone: '5511956789012', email: 'juliana@services.com', company: 'Services Ltd', value: 3200, stageIdx: 4 },
    { name: 'Bruno Mendes', phone: '5511967890123', email: 'bruno@logistics.com', company: 'Logistics Pro', value: 7800, stageIdx: 5 },
    { name: 'Camila Ferreira', phone: '5511978901234', email: 'camila@health.com', company: 'Health Plus', value: 15000, stageIdx: 1 },
    { name: 'Lucas Alves', phone: '5511989012345', email: 'lucas@fintech.com', company: 'FinTech Co', value: 30000, stageIdx: 2 },
  ];

  for (const lead of sampleLeads) {
    const stage = stages[lead.stageIdx];
    const statusMap: Record<string, any> = {
      'Novo Lead': 'NEW', 'Em Atendimento': 'IN_PROGRESS',
      'Proposta': 'PROPOSAL', 'Negociação': 'NEGOTIATION',
      'Fechado': 'CLOSED', 'Perdido': 'LOST',
    };

    await prisma.lead.create({
      data: {
        name: lead.name, phone: lead.phone, email: lead.email,
        company: lead.company, value: lead.value,
        status: statusMap[stage.name] || 'NEW',
        pipelineStageId: stage.id,
        operatorId: Math.random() > 0.5 ? operator1.id : operator2.id,
        source: ['Website', 'Indicação', 'LinkedIn', 'WhatsApp', 'Instagram'][Math.floor(Math.random() * 5)],
        tagsStr: JSON.stringify([['Premium', 'VIP', 'Quente', 'Frio'][Math.floor(Math.random() * 4)]]),
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Credentials:');
  console.log('  Master:     master@protectcrm.com / master123');
  console.log('  Supervisor: supervisor@protectcrm.com / supervisor123');
  console.log('  Operator 1: joao@protectcrm.com / operator123');
  console.log('  Operator 2: ana@protectcrm.com / operator123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
