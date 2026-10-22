// Nichos (verticais) suportados pelo sistema. O nicho é escolhido
// pela barbearia/salão/estúdio no cadastro e muda os textos que o
// cliente final vê (o substantivo do profissional, do lugar etc.).

export interface VerticalLabels {
  /** nome do nicho (ex.: Barbearia, Salão) */
  name: string
  /** substantivo do profissional (singular/plural) */
  professional: string
  professionals: string
  /** nome do lugar (ex.: barbearia, salão) */
  place: string
  /** título da seção de catálogo no site */
  servicesTitle: string
}

interface VerticalDef extends VerticalLabels {
  /** catálogo pronto: serviços sugeridos (nome, preço em R$, duração) */
  catalog: { name: string; description: string | null; price: string; duration_min: number }[]
}

const DEFS: Record<string, VerticalDef> = {
  barbearia: {
    name: 'Barbearia',
    professional: 'barbeiro',
    professionals: 'barbeiros',
    place: 'barbearia',
    servicesTitle: 'Serviços',
    catalog: [
      { name: 'Corte Masculino', description: 'Máquina e tesoura com finalização.', price: '45', duration_min: 30 },
      { name: 'Corte + Barba', description: 'Combo completo com toalha quente.', price: '70', duration_min: 50 },
      { name: 'Barba Terapia', description: 'Modelagem e hidratação da barba.', price: '35', duration_min: 20 },
      { name: 'Pigmentação', description: 'Preenchimento e correção de falhas.', price: '60', duration_min: 40 },
      { name: 'Corte Infantil', description: 'Atendimento paciente para os pequenos.', price: '35', duration_min: 30 },
      { name: 'Pezinho', description: 'Acabamento de contorno rápido.', price: '20', duration_min: 15 },
    ],
  },
  salao: {
    name: 'Salão de beleza',
    professional: 'profissional',
    professionals: 'profissionais',
    place: 'salão',
    servicesTitle: 'Serviços',
    catalog: [
      { name: 'Corte Feminino', description: 'Corte personalizado com finalização.', price: '80', duration_min: 60 },
      { name: 'Coloração', description: 'Cor completa ou retoque de raiz.', price: '180', duration_min: 120 },
      { name: 'Escova Modelada', description: 'Escova com finalização.', price: '60', duration_min: 45 },
      { name: 'Hidratação', description: 'Tratamento reconstrutor com máscara.', price: '90', duration_min: 60 },
      { name: 'Mechas/Balayage', description: 'Técnicas modernas de iluminação.', price: '250', duration_min: 180 },
      { name: 'Penteado', description: 'Penteados para festas e noivas.', price: '150', duration_min: 90 },
    ],
  },
  estetica: {
    name: 'Clínica de estética',
    professional: 'esteticista',
    professionals: 'esteticistas',
    place: 'clínica',
    servicesTitle: 'Procedimentos',
    catalog: [
      { name: 'Limpeza de Pele', description: 'Limpeza profunda com extração.', price: '120', duration_min: 60 },
      { name: 'Peeling Químico', description: 'Renovação celular da pele.', price: '180', duration_min: 45 },
      { name: 'Massagem Relaxante', description: 'Corpo inteiro com óleos.', price: '150', duration_min: 60 },
      { name: 'Drenagem Linfática', description: 'Redução de retenção e inchaço.', price: '130', duration_min: 60 },
      { name: 'Design de Sobrancelhas', description: 'Design com pinça e henna.', price: '60', duration_min: 30 },
      { name: 'Massagem Facial', description: 'Lifting natural com massoterapia.', price: '90', duration_min: 40 },
    ],
  },
  manicure: {
    name: 'Studio de unhas',
    professional: 'manicure',
    professionals: 'manicures',
    place: 'studio',
    servicesTitle: 'Serviços',
    catalog: [
      { name: 'Manicure', description: 'Cutilagem e esmaltação.', price: '35', duration_min: 45 },
      { name: 'Pedicure', description: 'Cuidado completo dos pés.', price: '45', duration_min: 50 },
      { name: 'Alongamento em Gel', description: 'Alongamento com gel UV.', price: '120', duration_min: 120 },
      { name: 'Fibra de Vidro', description: 'Alongamento resistente e natural.', price: '140', duration_min: 120 },
      { name: 'Nail Art', description: 'Arte personalizada nas unhas.', price: '25', duration_min: 30 },
      { name: 'Spa dos Pés', description: 'Hidratação e esfoliação completa.', price: '70', duration_min: 60 },
    ],
  },
  tatuagem: {
    name: 'Estúdio de tatuagem',
    professional: 'tatuador',
    professionals: 'tatuadores',
    place: 'estúdio',
    servicesTitle: 'Serviços',
    catalog: [
      { name: 'Sessão de Tatuagem (1h)', description: 'Sessão de uma hora de trabalho.', price: '250', duration_min: 60 },
      { name: 'Tatuagem Pequena', description: 'Até 10cm, linha fina ou preto.', price: '180', duration_min: 90 },
      { name: 'Orelha/Nariz', description: 'Piercing com material descartável.', price: '80', duration_min: 30 },
      { name: 'Remoção a Laser (sessão)', description: 'Sessão de remoção a laser.', price: '200', duration_min: 30 },
      { name: 'Consultoria de Projeto', description: 'Desenho e orçamento sob medida.', price: '100', duration_min: 45 },
    ],
  },
  personal: {
    name: 'Personal trainer',
    professional: 'treinador',
    professionals: 'treinadores',
    place: 'espaço',
    servicesTitle: 'Planos',
    catalog: [
      { name: 'Aula Individual', description: 'Treino personalizado 1:1.', price: '100', duration_min: 60 },
      { name: 'Aula Dupla', description: 'Treino em dupla (por pessoa).', price: '70', duration_min: 60 },
      { name: 'Avaliação Física', description: 'Bioimpedância + relatório.', price: '90', duration_min: 45 },
      { name: 'Plano Mensal (8x)', description: 'Pacote de 8 aulas no mês.', price: '640', duration_min: 60 },
    ],
  },
}

export const VERTICAL_OPTIONS = Object.entries(DEFS).map(([key, def]) => ({
  key,
  name: def.name,
  professional: def.professional,
}))

export function isValidVertical(key: string | null | undefined): boolean {
  return !!key && key in DEFS
}

export function labelsFor(vertical: string | null | undefined): VerticalLabels {
  const def = (vertical && DEFS[vertical]) || DEFS.barbearia
  const { name, professional, professionals, place, servicesTitle } = def
  return { name, professional, professionals, place, servicesTitle }
}

export function catalogFor(vertical: string | null | undefined) {
  const def = (vertical && DEFS[vertical]) || DEFS.barbearia
  return def.catalog
}

/** "Barbearia" -> "Barbearia", "salao" -> "Salão de beleza" */
export function verticalName(vertical: string | null | undefined): string {
  return labelsFor(vertical).name
}
