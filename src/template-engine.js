/**
 * Simple template engine for rendering HTML templates
 */
export function renderTemplate(template, data) {
  let result = template;
  
  // Process blocks FIRST (before simple variables) so context is set up correctly
  // Handle each blocks {{#each array}}...{{/each}}
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayKey, content) => {
    const array = data[arrayKey] || [];
    return array.map((item, index) => {
      // Handle both object items and primitive items (strings, numbers)
      const itemData = { 
        ...data, 
        ...(typeof item === 'object' && item !== null ? item : {}),
        'this': typeof item === 'string' || typeof item === 'number' ? item : (item || ''),
        '@index': index + 1 
      };
      return renderTemplate(content, itemData);
    }).join('');
  });
  
  // Handle if blocks {{#if condition}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    const value = data[condition];
    if (value && (Array.isArray(value) ? value.length > 0 : value)) {
      return renderTemplate(content, data);
    }
    return '';
  });
  
  // Now process simple variables (after blocks are processed)
  // Handle raw content {{&variable}} or {{&@variable}} - no escaping
  result = result.replace(/\{\{&(@?\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : '';
  });
  
  // Handle simple variable substitution {{variable}} or {{@variable}} - with HTML escaping
  result = result.replace(/\{\{(@?\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined) return '';
    const value = String(data[key]);
    // Escape HTML
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  });
  
  return result;
}

