/**
 * Simple template engine for rendering HTML templates
 */

/**
 * Finds the matching closing tag for a block by counting nested blocks
 */
function findMatchingClose(template, startPos) {
  let depth = 1;
  let pos = startPos;
  const openTag = '{{#each';
  const closeTag = '{{/each}}';
  
  while (depth > 0 && pos < template.length) {
    const nextOpen = template.indexOf(openTag, pos);
    const nextClose = template.indexOf(closeTag, pos);
    
    if (nextClose === -1) return -1; // No closing tag found
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + openTag.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      pos = nextClose + closeTag.length;
    }
  }
  
  return -1;
}

export function renderTemplate(template, data) {
  let result = template;
  
  // Process blocks FIRST (before simple variables) so context is set up correctly
  // Handle each blocks {{#each array}}...{{/each}} - handle nesting correctly
  let changed = true;
  let iterations = 0;
  const maxIterations = 100; // Safety limit
  
  while (changed && iterations < maxIterations) {
    iterations++;
    changed = false;
    let newResult = '';
    let pos = 0;
    
    while (pos < result.length) {
      const eachStart = result.indexOf('{{#each', pos);
      if (eachStart === -1) {
        newResult += result.slice(pos);
        break;
      }
      
      // Output everything before the {{#each}}
      newResult += result.slice(pos, eachStart);
      
      // Find the end of the {{#each}} tag
      const tagEnd = result.indexOf('}}', eachStart);
      if (tagEnd === -1) {
        newResult += result.slice(eachStart);
        break;
      }
      
      // Extract the array key
      const arrayKey = result.slice(eachStart + 7, tagEnd).trim();
      
      // Find the matching {{/each}}
      const closePos = findMatchingClose(result, tagEnd + 2);
      if (closePos === -1) {
        newResult += result.slice(eachStart);
        break;
      }
      
      // Extract the content
      const content = result.slice(tagEnd + 2, closePos);
      
      // Process this block
      const array = data[arrayKey] || [];
      const rendered = array.map((item, index) => {
        const itemData = { 
          ...data, 
          ...(typeof item === 'object' && item !== null ? item : {}),
          'this': typeof item === 'string' || typeof item === 'number' ? item : (item || ''),
          '@index': index + 1 
        };
        // Recursively process the content (this will handle nested blocks and conditionals)
        return renderTemplate(content, itemData);
      }).join('');
      
      newResult += rendered;
      changed = true;
      pos = closePos + '{{/each}}'.length;
    }
    
    result = newResult;
  }
  
  // Handle if blocks {{#if condition}}...{{/if}} - handle nesting correctly
  function findMatchingIfClose(template, startPos) {
    let depth = 1;
    let pos = startPos;
    const openTag = '{{#if';
    const closeTag = '{{/if}}';
    const elseTag = '{{else}}';
    
    while (depth > 0 && pos < template.length) {
      const nextOpen = template.indexOf(openTag, pos);
      const nextClose = template.indexOf(closeTag, pos);
      const nextElse = template.indexOf(elseTag, pos);
      
      if (nextClose === -1) return -1;
      
      // Skip {{else}} tags - they don't affect depth
      const nextRelevant = [nextOpen !== -1 ? nextOpen : Infinity, nextClose].filter(x => x !== -1);
      const minPos = Math.min(...nextRelevant);
      
      if (nextOpen !== -1 && nextOpen === minPos && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + openTag.length;
      } else {
        depth--;
        if (depth === 0) return nextClose;
        pos = nextClose + closeTag.length;
      }
    }
    
    return -1;
  }
  
  // Find the {{else}} that belongs to the current {{#if}} block (not nested ones)
  function findMatchingElse(template, startPos, endPos) {
    let depth = 0;
    let pos = startPos;
    const openTag = '{{#if';
    const elseTag = '{{else}}';
    const closeTag = '{{/if}}';
    
    while (pos < endPos) {
      const nextOpen = template.indexOf(openTag, pos);
      const nextElse = template.indexOf(elseTag, pos);
      const nextClose = template.indexOf(closeTag, pos);
      
      if (nextElse === -1) return -1;
      
      // Check if this {{else}} belongs to the current block (depth === 0)
      const candidates = [nextOpen !== -1 ? nextOpen : Infinity, nextElse, nextClose !== -1 ? nextClose : Infinity].filter(x => x !== -1);
      const minPos = Math.min(...candidates);
      
      if (nextOpen !== -1 && nextOpen === minPos) {
        depth++;
        pos = nextOpen + openTag.length;
      } else if (nextElse === minPos) {
        if (depth === 0) return nextElse;
        pos = nextElse + elseTag.length;
      } else if (nextClose === minPos) {
        depth--;
        pos = nextClose + closeTag.length;
      } else {
        break;
      }
    }
    
    return -1;
  }
  
  let ifChanged = true;
  let ifIterations = 0;
  while (ifChanged && ifIterations < 100) {
    ifIterations++;
    ifChanged = false;
    let newResult = '';
    let pos = 0;
    
    while (pos < result.length) {
      const ifStart = result.indexOf('{{#if', pos);
      if (ifStart === -1) {
        newResult += result.slice(pos);
        break;
      }
      
      newResult += result.slice(pos, ifStart);
      
      const tagEnd = result.indexOf('}}', ifStart);
      if (tagEnd === -1) {
        newResult += result.slice(ifStart);
        break;
      }
      
      const condition = result.slice(ifStart + 5, tagEnd).trim();
      
      const closePos = findMatchingIfClose(result, tagEnd + 2);
      if (closePos === -1) {
        newResult += result.slice(ifStart);
        break;
      }
      
      let content = result.slice(tagEnd + 2, closePos);
      let elseContent = '';
      
      // Check for {{else}} block that belongs to this {{#if}}
      const elsePos = findMatchingElse(result, tagEnd + 2, closePos);
      if (elsePos !== -1) {
        elseContent = result.slice(elsePos + 8, closePos); // Skip {{else}}
        content = result.slice(tagEnd + 2, elsePos);
      }
      
      const value = data[condition];
      if (value && (Array.isArray(value) ? value.length > 0 : value)) {
        newResult += renderTemplate(content, data);
      } else if (elseContent) {
        newResult += renderTemplate(elseContent, data);
      }
      
      ifChanged = true;
      pos = closePos + '{{/if}}'.length;
    }
    
    result = newResult;
  }
  
  // Now process simple variables (after blocks are processed)
  // Handle raw content {{&variable}} or {{&@variable}} - no escaping
  result = result.replace(/\{\{&(@?\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : '';
  });
  
  // Handle simple variable substitution {{variable}} or {{@variable}} - with HTML escaping
  // Skip rendering object/array values that aren't meant to be displayed directly
  result = result.replace(/\{\{(@?\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined) return '';
    const value = data[key];
    // Don't render objects or arrays as strings (they show as [object Object])
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return ''; // Skip object rendering
    }
    if (Array.isArray(value)) {
      return ''; // Skip array rendering
    }
    const strValue = String(value);
    // Escape HTML
    return strValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  });
  
  return result;
}
