class DeckScoreCalculator {
  constructor() {
    this.scores = {};
    this.cardCounts = {};
    this.cidToNameMap = {};
    this.nameToCidMap = {};
    this.totalScore = 0;
    this.loadScores();
  }

  async loadScores() {
    try {
      if (window.YUGIOH_CARD_SCORES) {
        this.scores = window.YUGIOH_CARD_SCORES;
        this.buildCardMappings();
        this.calculateScore();
        return;
      }
      
      this.scores = this.getDefaultScores();
      this.buildCardMappings();
      this.calculateScore();
      
    } catch (error) {
      this.scores = this.getDefaultScores();
      this.buildCardMappings();
      this.calculateScore();
    }
  }
  
  getDefaultScores() {
    return {
      "18050": 5
    };
  }

  buildCardMappings() {
    const cardLinks = document.querySelectorAll('a[href*="cid="][title]');
    
    cardLinks.forEach(link => {
      const href = link.getAttribute('href');
      const cardName = link.getAttribute('title');
      const cidMatch = href.match(/cid=(\d+)/);
      
      if (cidMatch && cardName) {
        const cid = cidMatch[1];
        this.cidToNameMap[cid] = cardName;
        this.nameToCidMap[cardName] = cid;
        
        if (window.normalizeCardName) {
          const normalizedName = window.normalizeCardName(cardName);
          this.nameToCidMap[normalizedName] = cid;
        }
      }
    });
  }

  extractCardData() {
    this.cardCounts = {};
    
    const cardSets = ['main', 'extra', 'side'];
    
    cardSets.forEach(setType => {
      const cardSet = document.querySelector(`#${setType}.card_set`);
      if (cardSet) {
        const cardLinks = cardSet.querySelectorAll('a[href*="cid="]');
        
        cardLinks.forEach(link => {
          const href = link.getAttribute('href');
          const cidMatch = href.match(/cid=(\d+)/);
          
          if (cidMatch) {
            const cid = cidMatch[1];
            this.cardCounts[cid] = (this.cardCounts[cid] || 0) + 1;
          }
        });
      }
    });
  }

  getScoreByName(cardName) {
    if (this.scores[cardName] !== undefined) {
      return parseInt(this.scores[cardName]) || 0;
    }
    
    if (window.normalizeCardName) {
      const normalizedName = window.normalizeCardName(cardName);
      for (const [scoreName, score] of Object.entries(this.scores)) {
        if (window.normalizeCardName(scoreName) === normalizedName) {
          return parseInt(score) || 0;
        }
      }
    }
    return 0;
  }

  getScoreByCID(cid) {
    if (this.scores[cid] !== undefined) {
      return parseInt(this.scores[cid]) || 0;
    }
    return 0;
  }

  calculateScore() {
    this.extractCardData();
    this.totalScore = 0;
    
    for (const [cid, count] of Object.entries(this.cardCounts)) {
      const cardScore = this.getScoreByCID(cid);
      const cardName = this.getCardName(cid);

      this.totalScore += cardScore * count;
    }
    this.displayResults();
  }

  getCardName(cid) {
    const rawName = this.cidToNameMap[cid] || `ID: ${cid}`;
    return this.cleanCardName(rawName);
  }

  cleanCardName(cardName) {
    if (!cardName || cardName.startsWith('ID:')) {
      return cardName;
    }
	
    let cleanName = cardName.replace(/^\*?\*?【[^】]*】\s*/g, '');
    cleanName = cleanName.replace(/^\*?\*?\[[^\]]*\]\s*/g, '');
    cleanName = cleanName.trim().replace(/\s+/g, ' ');
    
    return cleanName || cardName;
  }

  displayResults() {
    const existingResult = document.getElementById('deck-score-result');
    if (existingResult) {
      existingResult.remove();
    }
    const resultContainer = document.createElement('div');
    resultContainer.id = 'deck-score-result';
    resultContainer.className = 'deck-score-container';

    const totalScoreElement = document.createElement('div');
    totalScoreElement.className = 'total-score';
    totalScoreElement.innerHTML = `
      <h3>Total Genesys Score: ${this.totalScore}</h3>
      <div class="score-status ${this.totalScore > 100 ? 'over-limit' : 'within-limit'}">
        ${this.totalScore > 100 ? '⚠️ Over 100 Points' : '✅ Within 100 Points'}
      </div>
    `;

    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'score-details';
    detailsContainer.innerHTML = '<h4>Details:</h4>';

    const cardList = document.createElement('ul');
    cardList.className = 'card-score-list';

    const scoredCards = Object.entries(this.cardCounts)
      .map(([cid, count]) => {
        const cardName = this.getCardName(cid);
        const score = this.getScoreByCID(cid);
        
        return {
          cid,
          count,
          score,
          totalScore: score * count,
          name: cardName
        };
      })
      .filter(card => card.score > 0)
      .sort((a, b) => b.totalScore - a.totalScore);

    if (scoredCards.length === 0) {
      cardList.innerHTML = '<li>There`re no scored cards.</li>';
    } else {
      scoredCards.forEach(card => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
          <span class="card-name">${card.name}</span>
          <span class="card-info">
            Score ${card.score} × ${card.count} = ${card.totalScore}
          </span>
        `;
        cardList.appendChild(listItem);
      });
    }

    detailsContainer.appendChild(cardList);

    resultContainer.appendChild(totalScoreElement);
    resultContainer.appendChild(detailsContainer);

    const targetContainer = document.querySelector('#article_body') || document.body;
    targetContainer.insertBefore(resultContainer, targetContainer.firstChild);
  }

  displayError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.id = 'deck-score-error';
    errorContainer.className = 'deck-score-error';
    errorContainer.innerHTML = `<p>⚠️ ${message}</p>`;

    const targetContainer = document.querySelector('#article_body') || document.body;
    targetContainer.insertBefore(errorContainer, targetContainer.firstChild);
  }
}

function initDeckScoreCalculator() {
  if (window.location.href.includes('member_deck.action')) {
    setTimeout(() => {
      window.calculator = new DeckScoreCalculator();
    }, 1000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDeckScoreCalculator);
} else {
  initDeckScoreCalculator();
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initDeckScoreCalculator, 1000);
  }
}).observe(document, { subtree: true, childList: true });