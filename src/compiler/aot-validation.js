/**
 * Codeless v4 – AOT validation code generation (extracted from codegen for readability)
 * Produces inline validate_SchemaName(data) functions and TypeScript field types.
 */

/**
 * Generate the validate_SchemaName(data) function source for a data block.
 * @param {{ name: string, fields: Array<{ name: string, type: string, optional?: boolean, args?: { min?: number, max?: number, enum?: string[] } }> }} schema
 * @returns {string}
 */
export function schemaToValidationCode(schema) {
  let code = `function validate_${schema.name}(data) {\n`;
  code += `  if (data === null || typeof data !== 'object' || Array.isArray(data)) {\n`;
  code += `    throw Object.assign(new Error('${schema.name}: body must be a plain object'), { status: 400 });\n`;
  code += `  }\n`;
  code += `  const result = {};\n`;
  for (const f of schema.fields) {
    const key = f.name;
    const req = !f.optional;
    code += `  if (data['${key}'] === undefined || data['${key}'] === null) {\n`;
    if (req) {
      code += `    throw Object.assign(new Error('${schema.name}: missing required field "${key}"'), { status: 400 });\n`;
    } else {
      code += `    result['${key}'] = null;\n`;
    }
    code += `  } else {\n`;

    if (['string', 'password', 'date', 'enum'].includes(f.type.toLowerCase()) || f.args?.enum) {
      code += `    if (typeof data['${key}'] !== 'string') throw Object.assign(new Error('${schema.name}: "${key}" must be a string'), { status: 400 });\n`;
      if (f.args?.min !== undefined) code += `    if (data['${key}'].length < ${f.args.min}) throw Object.assign(new Error('${schema.name}: "${key}" too short'), { status: 400 });\n`;
      if (f.args?.max !== undefined) code += `    if (data['${key}'].length > ${f.args.max}) throw Object.assign(new Error('${schema.name}: "${key}" too long'), { status: 400 });\n`;
      if (f.args?.enum) {
        const enumStr = JSON.stringify(f.args.enum);
        code += `    if (!${enumStr}.includes(data['${key}'])) throw Object.assign(new Error('${schema.name}: "${key}" invalid enum'), { status: 400 });\n`;
      }
      code += `    result['${key}'] = data['${key}'];\n`;
    } else if (f.type.toLowerCase() === 'number') {
      code += `    const n = Number(data['${key}']);\n`;
      code += `    if (!Number.isFinite(n)) throw Object.assign(new Error('${schema.name}: "${key}" must be a number'), { status: 400 });\n`;
      if (f.args?.min !== undefined) code += `    if (n < ${f.args.min}) throw Object.assign(new Error('${schema.name}: "${key}" must be >= ${f.args.min}'), { status: 400 });\n`;
      if (f.args?.max !== undefined) code += `    if (n > ${f.args.max}) throw Object.assign(new Error('${schema.name}: "${key}" must be <= ${f.args.max}'), { status: 400 });\n`;
      code += `    result['${key}'] = n;\n`;
    } else if (f.type.toLowerCase() === 'boolean') {
      code += `    result['${key}'] = Boolean(data['${key}']);\n`;
    } else {
      code += `    result['${key}'] = data['${key}'];\n`;
    }
    code += `  }\n`;
  }
  code += `  return result;\n`;
  code += `}\n\n`;
  return code;
}

/**
 * Map schema field type to TypeScript type string.
 * @param {{ type: string }} f
 * @returns {string}
 */
export function fieldToTsType(f) {
  if (f.type === 'Number') return 'number';
  if (f.type === 'Boolean') return 'boolean';
  if (f.type === 'String' || f.type === 'Enum' || f.type === 'Password') return 'string';
  if (f.type === 'Date') return 'string';
  return 'unknown';
}

export default { schemaToValidationCode, fieldToTsType };
