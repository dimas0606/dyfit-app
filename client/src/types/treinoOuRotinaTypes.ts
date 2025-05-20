// client/src/types/treinoOuRotinaTypes.ts

// Representa um exercício dentro de um dia de treino, como vem da API populado e lean
// e como é usado internamente nos componentes de modal.
export interface ExercicioEmDiaDeTreinoDetalhado {
    _id?: string; // ID do subdocumento ExercicioEmDiaDeTreino no MongoDB (se já salvo)
    exercicioId: { // Objeto do exercício da biblioteca, populado
        _id: string;
        nome: string;
        grupoMuscular?: string;
        urlVideo?: string;
        descricao?: string;
        categoria?: string;
        tipo?: string; 
    } | string; // Pode ser apenas o ID string se não estiver populado
    series?: string;
    repeticoes?: string;
    carga?: string;
    descanso?: string;
    observacoes?: string;
    ordemNoDia: number;
    concluido?: boolean; // Usado pelo aluno ao realizar o treino
}

// Representa um dia de treino, como vem da API populado e lean
export interface DiaDeTreinoDetalhado {
    _id?: string; // ID do subdocumento DiaDeTreino no MongoDB (se já salvo)
    identificadorDia: string;
    nomeSubFicha?: string | null;
    ordemNaRotina: number;
    exerciciosDoDia?: ExercicioEmDiaDeTreinoDetalhado[];
}

// Interface para a Rotina/Ficha como listada na TreinosPage e usada no cache do React Query.
// Também é a base para o que é passado para os modais de visualização e edição.
export interface RotinaListagemItem {
    _id: string;
    titulo: string;
    descricao?: string | null;
    tipo: "modelo" | "individual";
    // Detalhes do aluno e criador, podem vir populados da API
    alunoId?: { _id: string; nome: string; email?: string; } | string | null; 
    criadorId: { _id: string; nome: string; email?: string; } | string; 
    
    tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
    diasDeTreino?: DiaDeTreinoDetalhado[]; // Array de dias de treino detalhados

    // Campos específicos de modelo
    pastaId?: { _id: string; nome: string; } | string | null;
    statusModelo?: "ativo" | "rascunho" | "arquivado" | null;
    ordemNaPasta?: number;

    // Campos específicos de individual
    dataValidade?: string | Date | null; // API pode retornar string, mas Date é útil no form
    totalSessoesRotinaPlanejadas?: number | null;
    sessoesRotinaConcluidas?: number;

    // Timestamps e virtuais (como vêm da API .lean())
    criadoEm: string; 
    atualizadoEm?: string; 
    isExpirada?: boolean;
    progressoRotina?: string;
    __v?: number;
}