// Run with `npm run swagger` to (re)generate swagger.json. Commit the result.
const fs = require('fs');

const err = (desc) => ({
  description: desc,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
});
const idParam = (name, what) => ({
  name, in: 'path', required: true, description: `${what} ObjectId (24 hex chars)`,
  schema: { type: 'string', example: '652f1c2e8a1b2c3d4e5f6a7b' }
});
const json = (ref) => ({ required: true, content: { 'application/json': { schema: { $ref: ref } } } });
const ok = (desc, schema) => ({ description: desc, content: { 'application/json': { schema } } });
const msg = (extra = {}) => ({
  type: 'object',
  properties: { message: { type: 'string' }, ...extra }
});

function crud(tag, plural, singular, idName, inputRef, outputRef) {
  const base = `/${plural}`;
  const Cap = singular[0].toUpperCase() + singular.slice(1);
  return {
    [base]: {
      get: {
        tags: [tag], summary: `Get all ${plural}`,
        responses: {
          200: ok(`List of ${plural}`, { type: 'array', items: { $ref: outputRef } }),
          500: err('Server error')
        }
      },
      post: {
        tags: [tag], summary: `Create a ${singular}`,
        requestBody: json(inputRef),
        responses: {
          201: ok(`${Cap} created`, msg({ id: { type: 'string' } })),
          400: err('Validation failed'),
          ...(tag === 'Users' ? { 409: err('Duplicate githubId or username') } : {}),
          500: err('Server error')
        }
      }
    },
    [`${base}/{${idName}}`]: {
      get: {
        tags: [tag], summary: `Get a ${singular} by id`,
        parameters: [idParam(idName, Cap)],
        responses: {
          200: ok(Cap, { $ref: outputRef }),
          400: err('Invalid id'), 404: err(`${Cap} not found`), 500: err('Server error')
        }
      },
      put: {
        tags: [tag], summary: `Update a ${singular} (full replace of fields)`,
        parameters: [idParam(idName, Cap)],
        requestBody: json(inputRef),
        responses: {
          200: ok(`${Cap} updated`, msg({ [singular]: { $ref: outputRef } })),
          400: err('Validation failed or invalid id'),
          404: err(`${Cap} not found`),
          ...(tag === 'Users' ? { 409: err('Duplicate githubId or username') } : {}),
          500: err('Server error')
        }
      },
      delete: {
        tags: [tag], summary: `Delete a ${singular}`,
        parameters: [idParam(idName, Cap)],
        responses: {
          200: ok(`${Cap} deleted`, msg()),
          400: err('Invalid id'), 404: err(`${Cap} not found`), 500: err('Server error')
        }
      }
    }
  };
}

const userInput = {
  type: 'object',
  required: ['githubId', 'username', 'email'],
  properties: {
    githubId: { type: 'string', example: '1234567' },
    username: { type: 'string', example: 'andrea-g' },
    displayName: { type: 'string', example: 'Andrea González' },
    email: { type: 'string', format: 'email', example: 'andrea@example.com' },
    avatarUrl: { type: 'string', format: 'uri', example: 'https://avatars.githubusercontent.com/u/1234567' },
    role: { type: 'string', enum: ['user', 'admin'], default: 'user' }
  }
};
const recipeInput = {
  type: 'object',
  required: ['title', 'ingredients', 'instructions', 'prepTimeMinutes', 'cookTimeMinutes', 'servings', 'difficulty'],
  properties: {
    title: { type: 'string', example: 'Chicken Tikka Masala' },
    description: { type: 'string', example: 'Creamy, mildly spiced tomato curry.' },
    ingredients: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string', example: 'chicken breast' },
          quantity: { type: 'number', example: 500 },
          unit: { type: 'string', example: 'g' }
        }
      }
    },
    instructions: { type: 'array', minItems: 1, items: { type: 'string' }, example: ['Marinate chicken.', 'Simmer in sauce.'] },
    prepTimeMinutes: { type: 'integer', minimum: 0, example: 20 },
    cookTimeMinutes: { type: 'integer', minimum: 0, example: 30 },
    servings: { type: 'integer', minimum: 1, example: 4 },
    cuisine: { type: 'string', example: 'Indian' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    tags: { type: 'array', items: { type: 'string' }, example: ['dinner', 'spicy'] },
    createdBy: { type: 'string', description: 'Optional ObjectId of an existing user', example: '652f1c2e8a1b2c3d4e5f6a7b' }
  }
};
const withMeta = (input, extra) => ({
  type: 'object',
  properties: { _id: { type: 'string' }, ...input.properties, ...extra }
});
const dates = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' }
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Meal Compass API',
    version: '1.0.0',
    description: 'REST API for planning weekly meals. Part 1: Users and Recipes collections with full CRUD.'
  },
  servers: [{ url: '/', description: 'Current host (localhost or Render)' }],
  tags: [{ name: 'Users' }, { name: 'Recipes' }],
  paths: {
    ...crud('Users', 'users', 'user', 'userId', '#/components/schemas/UserInput', '#/components/schemas/User'),
    ...crud('Recipes', 'recipes', 'recipe', 'recipeId', '#/components/schemas/RecipeInput', '#/components/schemas/Recipe')
  },
  components: {
    schemas: {
      UserInput: userInput,
      User: withMeta(userInput, { createdAt: dates.createdAt, lastLoginAt: { type: 'string', format: 'date-time', nullable: true } }),
      RecipeInput: recipeInput,
      Recipe: withMeta(recipeInput, dates),
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } }
          }
        }
      }
    }
  }
};

fs.writeFileSync(__dirname + '/swagger.json', JSON.stringify(spec, null, 2));
console.log('swagger.json generated');
