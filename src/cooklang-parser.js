/**
 * Cooklang Parser
 * Converts Cooklang .cook files to markdown format matching cook CLI output
 */

/**
 * Parses a Cooklang recipe file and converts it to markdown
 * @param {string} cookContent - The raw content of the .cook file
 * @returns {string} Markdown formatted recipe
 */
export function parseCooklangToMarkdown(cookContent) {
    // Remove frontmatter for processing (we'll handle it separately)
    const frontmatterMatch = cookContent.match(/^---\n([\s\S]*?)\n---/);
    const contentWithoutFrontmatter = frontmatterMatch
        ? cookContent.slice(frontmatterMatch[0].length).trim()
        : cookContent.trim();

    // Extract all ingredients, equipment, and timers
    const ingredients = new Map(); // ingredient name -> {amount, unit}
    const equipment = new Set();
    const timers = [];

    // Parse ingredients: @ingredient{amount%unit} or @ingredient{}
    const ingredientRegex = /@([^{}]+)\{([^}]*)\}/g;
    let match;
    while ((match = ingredientRegex.exec(cookContent)) !== null) {
        const ingredientName = match[1].trim();
        const spec = match[2].trim();

        // Parse amount and unit from spec (format: "amount%unit" or just description)
        let amount = null;
        let unit = null;

        if (spec) {
            const amountMatch = spec.match(/^([\d.-]+)%(.+)$/);
            if (amountMatch) {
                amount = amountMatch[1];
                unit = amountMatch[2].trim();
            } else if (/^\d/.test(spec)) {
                // Just a number, treat as amount
                amount = spec;
            }
        }

        // Store ingredient (deduplicate by name, keeping the most detailed spec)
        if (!ingredients.has(ingredientName) || (amount && !ingredients.get(ingredientName).amount)) {
            ingredients.set(ingredientName, { amount, unit, spec });
        }
    }

    // Parse equipment: #equipment{}
    const equipmentRegex = /#([^{}]+)\{([^}]*)\}/g;
    while ((match = equipmentRegex.exec(cookContent)) !== null) {
        const equipmentName = match[1].trim();
        equipment.add(equipmentName);
    }

    // Parse timers: ~{time%unit}
    const timerRegex = /~\{([^}]+)\}/g;
    while ((match = timerRegex.exec(cookContent)) !== null) {
        const timerSpec = match[1].trim();
        timers.push(timerSpec);
    }

    // Convert content to markdown steps
    const lines = contentWithoutFrontmatter.split('\n').filter(line => line.trim());
    const steps = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Convert Cooklang syntax to plain text in the step
        let stepText = line
            // Replace ingredients: @ingredient{spec} -> "ingredient"
            .replace(/@([^{}]+)\{([^}]*)\}/g, (match, name, spec) => {
                return name.trim();
            })
            // Replace equipment: #equipment{} -> "equipment"
            .replace(/#([^{}]+)\{([^}]*)\}/g, (match, name) => {
                return name.trim();
            })
            // Replace timers: ~{time%unit} -> "time unit"
            .replace(/~\{([^}]+)\}/g, (match, spec) => {
                const timerMatch = spec.match(/^([\d.-]+)%(.+)$/);
                if (timerMatch) {
                    return `${timerMatch[1]} ${timerMatch[2].trim()}`;
                }
                return spec;
            })
            .trim();

        if (stepText) {
            steps.push(stepText);
        }
    }

    // Build markdown output
    let markdown = '';

    // Ingredients section
    if (ingredients.size > 0) {
        markdown += '## Ingredients\n';
        const ingredientList = [];

        for (const [name, { amount, unit, spec }] of ingredients.entries()) {
            let ingredientLine = '';
            if (amount && unit) {
                ingredientLine = `- ${amount} ${unit} ${name}`;
            } else if (amount) {
                ingredientLine = `- ${amount} ${name}`;
            } else if (spec) {
                ingredientLine = `- ${name} (${spec})`;
            } else {
                ingredientLine = `- ${name}`;
            }
            ingredientList.push(ingredientLine);
        }

        // Sort ingredients (optional, but makes output more consistent)
        ingredientList.sort();
        markdown += ingredientList.join('\n') + '\n\n';
    }

    // Cookware section
    if (equipment.size > 0) {
        markdown += '## Cookware\n';
        const equipmentList = Array.from(equipment).sort().map(eq => `- ${eq}`);
        markdown += equipmentList.join('\n') + '\n\n';
    }

    // Steps section
    if (steps.length > 0) {
        markdown += '## Steps\n';

        // For each step, collect ingredients used in that step
        for (let i = 0; i < steps.length; i++) {
            const stepText = steps[i];
            const stepNumber = i + 1;

            // Find ingredients mentioned in this step
            const stepIngredients = [];
            for (const [name, { amount, unit }] of ingredients.entries()) {
                // Check if ingredient name appears in step (case-insensitive, whole word)
                const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (nameRegex.test(stepText)) {
                    if (amount && unit) {
                        stepIngredients.push(`${name}: ${amount} ${unit}`);
                    } else if (amount) {
                        stepIngredients.push(`${name}: ${amount}`);
                    } else {
                        stepIngredients.push(name);
                    }
                }
            }

            // Format step with ingredient metadata
            const ingredientMetadata = stepIngredients.length > 0
                ? `[${stepIngredients.join('; ')}]`
                : '[–]';

            // Handle multi-line steps (wrap long lines)
            const wrappedStep = wrapStepText(stepText, 80);

            markdown += ` ${stepNumber}. ${wrappedStep}\n    ${ingredientMetadata}\n`;
        }
    }

    return markdown.trim();
}

/**
 * Wraps step text to handle long lines (matching cook CLI behavior)
 */
function wrapStepText(text, maxWidth) {
    if (text.length <= maxWidth) {
        return text;
    }

    // Simple word wrapping
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + ' ' + word).length <= maxWidth) {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }
            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.join('\n    ');
}

