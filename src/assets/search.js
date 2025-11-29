/**
 * Client-side search functionality
 */
(function() {
  let searchIndex = [];
  let allRecipes = [];
  
  // Load search index when page loads
  async function loadSearchIndex() {
    try {
      const response = await fetch('/search-index.json');
      searchIndex = await response.json();
      allRecipes = window.recipeData || [];
    } catch (error) {
      console.warn('Could not load search index:', error);
    }
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSearchIndex);
  } else {
    loadSearchIndex();
  }
  
  // Search function
  function searchRecipes(query) {
    if (!query || query.trim() === '') {
      return allRecipes;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const terms = searchTerm.split(/\s+/);
    
    return allRecipes.filter(recipe => {
      const searchText = [
        recipe.title,
        ...(recipe.tags || []),
        ...(recipe.categories || [])
      ].join(' ').toLowerCase();
      
      // Check if all search terms match
      return terms.every(term => searchText.includes(term));
    });
  }
  
  // Filter and display recipes
  function filterRecipes(query) {
    const recipeGrid = document.getElementById('recipeGrid');
    const noResults = document.getElementById('noResults');
    
    if (!recipeGrid) return;
    
    const filtered = searchRecipes(query);
    
    if (filtered.length === 0) {
      recipeGrid.classList.add('hidden');
      if (noResults) noResults.classList.remove('hidden');
    } else {
      recipeGrid.classList.remove('hidden');
      if (noResults) noResults.classList.add('hidden');
      
      // Hide/show recipe cards
      const cards = recipeGrid.querySelectorAll('div');
      const recipeUrls = new Set(filtered.map(r => r.url));
      
      cards.forEach(card => {
        const link = card.querySelector('a[href^="/recipe/"]');
        if (link) {
          const url = link.getAttribute('href');
          if (recipeUrls.has(url)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        }
      });
    }
  }
  
  // Setup search input handler
  function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterRecipes(e.target.value);
      }, 150);
    });
    
    // Also filter on page load if there's a query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
      searchInput.value = query;
      filterRecipes(query);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSearch);
  } else {
    setupSearch();
  }
})();

