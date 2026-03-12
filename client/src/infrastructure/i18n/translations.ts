// Language can be overridden by Vite env for tests or deployment.
const DEFAULT_LANGUAGE = "pt-br";
const configuredLanguage = import.meta.env.VITE_LANGUAGE;
const CURRENT_LANGUAGE =
  configuredLanguage === "en" || configuredLanguage === "pt-br"
    ? configuredLanguage
    : DEFAULT_LANGUAGE;

type Language = "en" | "pt-br";

interface Translations {
  home: {
    title: string;
    subtitle: string;
    createGameBtn: string;
    enterGameDetails: string;
    yourName: string;
    yourNamePlaceholder: string;
    matchId: string;
    matchIdPlaceholder: string;
    openVoting: string;
    openVotingDesc: string;
    createBtn: string;
    joinBtn: string;
    joinGameTitle: string;
    backBtn: string;
  };
  lobby: {
    title: string;
    waitingForPlayers: string;
    readyToStart: string;
    waitingForHost: string;
    gameCode: string;
    copied: string;
    clickToCopy: string;
    playersLabel: string;
    host: string;
    configTemplates: string;
    startBtn: string;
    leaveBtn: string;
    confirmLeave: string;
    errorStarting: string;
  };
  templateBuilder: {
    title: string;
    subtitle: string;
    playerTemplates: string;
    templateLabel: string;
    remove: string;
    templateNamePlaceholder: string;
    roles: {
      hero: string;
      villain: string;
      neutral: string;
    };
    victoryConditions: {
      teamVictory: string;
      eliminateAlignment: string;
      eliminateHeroes: string;
      eliminateVillains: string;
      eliminateNeutrals: string;
    };
    abilities: {
      kill: string;
      protect: string;
      voteShield: string;
      roleblock: string;
      investigate: string;
    };
    maxTemplatesReached: string;
    addTemplate: string;
    templatesCount: string;
    backBtn: string;
    saveAndStart: string;
    errorStarting: string;
  };
  game: {
    leaveGame: string;
    loading: string;
    confirmLeave: string;
    confirmAction: string;
    confirm: string;
    cancel: string;
    voteStatus: string;
    waiting: string;
    skip: string;
    unknownPlayer: string;
    voteInstruction: string;
    castVote: string;
    castingVote: string;
    skipVote: string;
    skippingVote: string;
    gameLog: string;
    gameStartedWaiting: string;
    yourRole: string;
    investigationResult: string;
    investigationConnector: string;
    eliminated: string;
    eliminatedMessage: string;
    advancing: string;
    nextPhase: string;
    yourAbilities: string;
    noAbilities: string;
    youLabel: string;
    voteCount: {
      singular: string;
      plural: string;
    };
    phases: {
      discussion: {
        name: string;
        desc: string;
      };
      action: {
        name: string;
        desc: string;
      };
      voting: {
        name: string;
        desc: string;
      };
      resolution: {
        name: string;
        desc: string;
      };
    };
  };
  end: {
    gameOver: string;
    thankYou: string;
    winner: string;
    endedAt: string;
    roleReveal: string;
    playAgain: string;
    startingRematch: string;
    waitingForHostRematch: string;
    leaveGame: string;
    errorRematch: string;
    heroesWin: string;
    villainsWin: string;
    neutralsWin: string;
    gameEnded: string;
    unknownTemplate: string;
    unknownAlignment: string;
  };
  errors: {
    failedCreateGame: string;
    failedJoinGame: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    home: {
      title: 'Social Deduction',
      subtitle: 'Create or join a game with friends',
      createGameBtn: 'Create New Game',
      enterGameDetails: 'Enter Game Details',
      yourName: 'Your Name',
      yourNamePlaceholder: 'Enter your name',
      matchId: 'Match ID',
      matchIdPlaceholder: 'Enter match ID',
      openVoting: 'Open Voting',
      openVotingDesc: 'Show who votes for whom in real time',
      createBtn: 'Create Game',
      joinBtn: 'Join Game',
      joinGameTitle: 'Join Existing Game',
      backBtn: 'Back to Create',
    },
    lobby: {
      title: 'Game Lobby',
      waitingForPlayers: 'Waiting for players to join',
      readyToStart: 'Ready to start',
      waitingForHost: 'Waiting for host to start',
      gameCode: 'Game Code',
      copied: 'Copied!',
      clickToCopy: 'Click to copy',
      playersLabel: 'Players',
      host: 'Host',
      configTemplates: 'Configure Templates',
      startBtn: 'Start Game',
      leaveBtn: 'Leave Game',
      confirmLeave: 'Leave the lobby?',
      errorStarting: 'Failed to start game',
    },
    templateBuilder: {
      title: 'Template Builder',
      subtitle: 'Configure roles for each player',
      playerTemplates: 'Player Templates',
      templateLabel: 'Template',
      remove: 'Remove',
      templateNamePlaceholder: 'Template name',
      roles: {
        hero: 'Hero',
        villain: 'Villain',
        neutral: 'Neutral',
      },
      victoryConditions: {
        teamVictory: 'Team Victory',
        eliminateAlignment: 'Eliminate Alignment',
        eliminateHeroes: 'Eliminate Heroes',
        eliminateVillains: 'Eliminate Villains',
        eliminateNeutrals: 'Eliminate Neutrals',
      },
      abilities: {
        kill: 'Kill',
        protect: 'Protect',
        voteShield: 'Vote Shield',
        roleblock: 'Roleblock',
        investigate: 'Investigate',
      },
      maxTemplatesReached: 'Max templates reached',
      addTemplate: 'Add Template',
      templatesCount: 'Templates',
      backBtn: 'Back to Lobby',
      saveAndStart: 'Save & Start',
      errorStarting: 'Failed to start game',
    },
    game: {
      leaveGame: '← Leave Game',
      loading: 'Loading...',
      confirmLeave: 'Leave the game?',
      confirmAction: 'Confirm your action',
      confirm: 'Confirm',
      cancel: 'Cancel',
      voteStatus: 'Vote Status',
      waiting: 'Waiting...',
      skip: 'Skip',
      unknownPlayer: '?',
      voteInstruction: 'Vote to eliminate a player',
      castVote: 'Cast Vote',
      castingVote: 'Casting Vote...',
      skipVote: 'Skip Vote',
      skippingVote: 'Skipping Vote...',
      gameLog: 'Game Log',
      gameStartedWaiting: 'Game started. Waiting for actions...',
      yourRole: 'Your Role',
      investigationResult: 'Investigation Result',
      investigationConnector: ' is a ',
      eliminated: 'You have been eliminated',
      eliminatedMessage: 'You can continue watching, but you can no longer vote or use abilities.',
      advancing: 'Advancing...',
      nextPhase: 'Next Phase →',
      yourAbilities: 'Your Abilities',
      noAbilities: '(No abilities available)',
      youLabel: ' (You)',
      voteCount: {
        singular: 'vote',
        plural: 'votes',
      },
      phases: {
        discussion: {
          name: 'Discussion',
          desc: 'Discuss with other players',
        },
        action: {
          name: 'Action',
          desc: 'Use your abilities',
        },
        voting: {
          name: 'Voting',
          desc: 'Vote to eliminate a player',
        },
        resolution: {
          name: 'Resolution',
          desc: 'Processing results...',
        },
      },
    },
    end: {
      gameOver: 'Game Over',
      thankYou: 'Thanks for playing!',
      winner: 'Winner',
      endedAt: 'Ended at ',
      roleReveal: 'Role Reveal',
      playAgain: 'Play Again',
      startingRematch: 'Starting Rematch...',
      waitingForHostRematch: 'Waiting for the host to start a rematch',
      leaveGame: 'Leave Game',
      errorRematch: 'Failed to start rematch',
      heroesWin: 'Heroes win',
      villainsWin: 'Villains win',
      neutralsWin: 'Neutrals win',
      gameEnded: 'Game Ended',
      unknownTemplate: 'Unknown',
      unknownAlignment: 'unknown',
    },
    errors: {
      failedCreateGame: 'Failed to create game. Make sure the server is running.',
      failedJoinGame: 'Failed to join game. Check the ID and try again.',
    },
  },
  'pt-br': {
    home: {
      title: 'Dedução Social',
      subtitle: 'Crie ou junte-se a um jogo com amigos',
      createGameBtn: 'Criar Novo Jogo',
      enterGameDetails: 'Digite os Detalhes do Jogo',
      yourName: 'Seu Nome',
      yourNamePlaceholder: 'Digite seu nome',
      matchId: 'ID da Partida',
      matchIdPlaceholder: 'Digite o ID da partida',
      openVoting: 'Votação Aberta',
      openVotingDesc: 'Mostrar quem vota em quem em tempo real',
      createBtn: 'Criar Jogo',
      joinBtn: 'Entrar no Jogo',
      joinGameTitle: 'Entrar em Jogo Existente',
      backBtn: 'Voltar para Criar',
    },
    lobby: {
      title: 'Sala de Espera',
      waitingForPlayers: 'Aguardando jogadores entrarem',
      readyToStart: 'Pronto para começar',
      waitingForHost: 'Aguardando o anfitrião começar',
      gameCode: 'Código do Jogo',
      copied: 'Copiado!',
      clickToCopy: 'Clique para copiar',
      playersLabel: 'Jogadores',
      host: 'Anfitrião',
      configTemplates: 'Configurar Templates',
      startBtn: 'Iniciar Jogo',
      leaveBtn: 'Sair do Jogo',
      confirmLeave: 'Sair da sala de espera?',
      errorStarting: 'Falha ao iniciar o jogo',
    },
    templateBuilder: {
      title: 'Construtor de Templates',
      subtitle: 'Configure papéis para cada jogador',
      playerTemplates: 'Templates de Jogadores',
      templateLabel: 'Template',
      remove: 'Remover',
      templateNamePlaceholder: 'Nome do template',
      roles: {
        hero: 'Herói',
        villain: 'Vilão',
        neutral: 'Neutro',
      },
      victoryConditions: {
        teamVictory: 'Vitória em Equipe',
        eliminateAlignment: 'Eliminar Alinhamento',
        eliminateHeroes: 'Eliminar Heróis',
        eliminateVillains: 'Eliminar Vilões',
        eliminateNeutrals: 'Eliminar Neutros',
      },
      abilities: {
        kill: 'Matar',
        protect: 'Proteger',
        voteShield: 'Escudo de Voto',
        roleblock: 'Bloqueio de Papel',
        investigate: 'Investigar',
      },
      maxTemplatesReached: 'Número máximo de templates atingido',
      addTemplate: 'Adicionar Template',
      templatesCount: 'Templates',
      backBtn: 'Voltar para a Sala',
      saveAndStart: 'Salvar e Começar',
      errorStarting: 'Falha ao iniciar o jogo',
    },
    game: {
      leaveGame: '← Sair do Jogo',
      loading: 'Carregando...',
      confirmLeave: 'Sair do jogo?',
      confirmAction: 'Confirme sua ação',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      voteStatus: 'Status de Votação',
      waiting: 'Aguardando...',
      skip: 'Pular',
      unknownPlayer: '?',
      voteInstruction: 'Vote para eliminar um jogador',
      castVote: 'Votar',
      castingVote: 'Votando...',
      skipVote: 'Pular Votação',
      skippingVote: 'Pulando Votação...',
      gameLog: 'Registro do Jogo',
      gameStartedWaiting: 'Jogo iniciado. Aguardando ações...',
      yourRole: 'Seu Papel',
      investigationResult: 'Resultado da Investigação',
      investigationConnector: ' é um(a) ',
      eliminated: 'Você foi eliminado',
      eliminatedMessage: 'Você pode continuar assistindo, mas não pode mais votar ou usar habilidades.',
      advancing: 'Avançando...',
      nextPhase: 'Próxima Fase →',
      yourAbilities: 'Suas Habilidades',
      noAbilities: '(Nenhuma habilidade disponível)',
      youLabel: ' (Você)',
      voteCount: {
        singular: 'voto',
        plural: 'votos',
      },
      phases: {
        discussion: {
          name: 'Discussão',
          desc: 'Discuta com outros jogadores',
        },
        action: {
          name: 'Ação',
          desc: 'Use suas habilidades',
        },
        voting: {
          name: 'Votação',
          desc: 'Vote para eliminar um jogador',
        },
        resolution: {
          name: 'Resolução',
          desc: 'Processando resultados...',
        },
      },
    },
    end: {
      gameOver: 'Jogo Terminou',
      thankYou: 'Obrigado por jogar!',
      winner: 'Vencedor',
      endedAt: 'Terminou em ',
      roleReveal: 'Revelação de Papéis',
      playAgain: 'Jogar Novamente',
      startingRematch: 'Iniciando Nova Partida...',
      waitingForHostRematch: 'Aguardando o anfitrião iniciar uma nova partida',
      leaveGame: 'Sair do Jogo',
      errorRematch: 'Falha ao iniciar nova partida',
      heroesWin: 'Heróis vencem',
      villainsWin: 'Vilões vencem',
      neutralsWin: 'Neutros vencem',
      gameEnded: 'Jogo Terminou',
      unknownTemplate: 'Desconhecido',
      unknownAlignment: 'desconhecido',
    },
    errors: {
      failedCreateGame: 'Falha ao criar jogo. Certifique-se de que o servidor está em execução.',
      failedJoinGame: 'Falha ao entrar no jogo. Verifique o ID e tente novamente.',
    },
  },
};

/**
 * Get translation string
 * Usage: t('home.title') returns 'Social Deduction' (en) or 'Dedução Social' (pt-br)
 */
export function t(path: string): string {
  const keys = path.split('.');
  let value: any = translations[CURRENT_LANGUAGE];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Translation key not found: ${path}`);
      return path;
    }
  }

  return typeof value === 'string' ? value : path;
}

// Export current language
export const i18n = {
  currentLanguage: CURRENT_LANGUAGE as Language,
  t,
};

export default i18n;
