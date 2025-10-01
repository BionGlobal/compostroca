import SHA256 from 'crypto-js/sha256';

export interface LoteHashData {
  codigo: string;
  unidade: string;
  data_inicio: string;
  data_encerramento: string | null;
  peso_inicial: number;
  peso_atual: number;
  latitude: number | null;
  longitude: number | null;
  criado_por: string;
  voluntarios?: string[];
  entregas?: string[];
  fotos?: string[];
  hash_anterior?: string | null;
  indice_cadeia?: number;
}

// Interface para dados completos do hash de rastreabilidade
export interface DadosHashRastreabilidade {
  lote_id: string;
  codigo_unico: string;
  timestamp_criacao: string;
  unidade_codigo: string;
  geolocation: {
    latitude: number | null;
    longitude: number | null;
  };
  peso_total_residuos: number;
  peso_cepilho: number;
  peso_inicial_total: number;
  voluntarios: Array<{
    id: string;
    nome: string;
    numero_balde: number;
    peso_entrega: number;
  }>;
  administrador_validador: string;
  total_entregas: number;
  assinatura_digital: string; // Timestamp + código único combinados
}

export interface ChainValidationResult {
  isValid: boolean;
  brokenAtIndex?: number;
  brokenLoteId?: string;
  totalLotes: number;
  validatedChainLength: number;
}

export const generateLoteHash = (data: LoteHashData): string => {
  // Criar um objeto ordenado e determinístico para o hash
  const hashData = {
    codigo: data.codigo,
    unidade: data.unidade,
    data_inicio: data.data_inicio,
    data_encerramento: data.data_encerramento,
    peso_inicial: Number(data.peso_inicial),
    peso_atual: Number(data.peso_atual),
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    criado_por: data.criado_por,
    voluntarios: data.voluntarios?.sort() || [],
    entregas: data.entregas?.sort() || [],
    fotos: data.fotos?.sort() || []
  };

  // Converter para string JSON ordenada
  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  
  // Gerar hash SHA256
  return SHA256(dataString).toString();
};

// Gerar hash com cadeia blockchain-like
export const generateChainedLoteHash = (data: LoteHashData, previousHash: string | null = null): string => {
  // Criar um objeto ordenado e determinístico para o hash com cadeia
  const hashData = {
    codigo: data.codigo,
    unidade: data.unidade,
    data_inicio: data.data_inicio,
    data_encerramento: data.data_encerramento,
    peso_inicial: Number(data.peso_inicial),
    peso_atual: Number(data.peso_atual),
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    criado_por: data.criado_por,
    voluntarios: data.voluntarios?.sort() || [],
    entregas: data.entregas?.sort() || [],
    fotos: data.fotos?.sort() || [],
    hash_anterior: previousHash || 'GENESIS',
    indice_cadeia: data.indice_cadeia || 0
  };

  // Converter para string JSON ordenada
  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  
  // Gerar hash SHA256
  return SHA256(dataString).toString();
};

export const validateLoteHash = (data: LoteHashData, storedHash: string): boolean => {
  const calculatedHash = generateLoteHash(data);
  return calculatedHash === storedHash;
};

// Gerar hash de rastreabilidade completo (mais robusto que o hash de integridade)
export const generateHashRastreabilidade = (dados: DadosHashRastreabilidade): string => {
  // Criar objeto ordenado e determinístico
  const hashData = {
    lote_id: dados.lote_id,
    codigo_unico: dados.codigo_unico,
    timestamp_criacao: dados.timestamp_criacao,
    unidade_codigo: dados.unidade_codigo,
    geolocation: {
      latitude: dados.geolocation.latitude !== null ? Number(dados.geolocation.latitude.toFixed(6)) : null,
      longitude: dados.geolocation.longitude !== null ? Number(dados.geolocation.longitude.toFixed(6)) : null,
    },
    peso_total_residuos: Number(dados.peso_total_residuos.toFixed(2)),
    peso_cepilho: Number(dados.peso_cepilho.toFixed(2)),
    peso_inicial_total: Number(dados.peso_inicial_total.toFixed(2)),
    voluntarios: dados.voluntarios
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(v => ({
        id: v.id,
        nome: v.nome,
        numero_balde: v.numero_balde,
        peso_entrega: Number(v.peso_entrega.toFixed(2))
      })),
    administrador_validador: dados.administrador_validador,
    total_entregas: dados.total_entregas,
    assinatura_digital: dados.assinatura_digital
  };

  // Converter para string JSON ordenada
  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  
  // Gerar hash SHA256
  return SHA256(dataString).toString();
};

// Validar hash de rastreabilidade
export const validateHashRastreabilidade = (dados: DadosHashRastreabilidade, storedHash: string): boolean => {
  const calculatedHash = generateHashRastreabilidade(dados);
  return calculatedHash === storedHash;
};

export const formatHashDisplay = (hash: string): string => {
  if (!hash) return '';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
};

// Formatar hash para exibição completa em seções
export const formatHashForDisplay = (hash: string): { prefix: string; middle: string; suffix: string } => {
  if (!hash) return { prefix: '', middle: '', suffix: '' };
  return {
    prefix: hash.substring(0, 16),
    middle: hash.substring(16, hash.length - 16),
    suffix: hash.substring(hash.length - 16)
  };
};