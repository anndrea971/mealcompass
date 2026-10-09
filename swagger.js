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
const msg = (extra = {}) => ({ type: 'object', properties: { message: { type: 'string' }, ...extra } });
const secured = [{ cookieAuth: [] }];

// opts.get: 'public' | 'login' | 'admin' (who may list), opts.getOne: same for single,
// opts.post: 'login' | 'admin', opts.owner: text describing who may PUT/DELETE.
function crud(tag, plural, singular, idName, inputRef, outputRef, opts) {
  const Cap = singular[0].toUpperCase() + singular.slice(1);
  const authErr = (level) => level === 'public' ? {} : {
    401: err('Not logged in – log in at /auth/github first'),
    ...(level === 'admin' ? { 403: err('Admin only') } : {})
  };
  const sec = (level) => (level === 'public' ? {} : { security: secured });
  const mut = (extra) => ({ 401: err('Not logged in – log in at /auth/github first'), 403: err(opts.owner), ...extra });
  const notes = opts.notes ? ` ${opts.notes}` : '';
  return {
    [`/${plural}`]: {
      get: {
        tags: [tag], summary: `Get all ${plural}`, description: opts.listDesc, ...sec(opts.get),
        responses: {
          200: ok(`List of ${plural}`, { type: 'array', items: { $ref: outputRef } }),
          ...authErr(opts.get), 500: err('Server error')
        }
      },
      post: {
        tags: [tag], summary: `Create a ${singular}`, description: `Requires login.${opts.post === 'admin' ? ' Admin only.' : ''}${notes}`,
        security: secured, requestBody: json(inputRef),
        responses: {
          201: ok(`${Cap} created`, msg({ id: { type: 'string' } })),
          400: err('Validation failed'),
          401: err('Not logged in – log in at /auth/github first'),
          ...(opts.post === 'admin' ? { 403: err('Admin only') } : {}),
          ...(tag === 'Users' ? { 409: err('Duplicate githubId or username') } : {}),
          500: err('Server error')
        }
      }
    },
    [`/${plural}/{${idName}}`]: {
      get: {
        tags: [tag], summary: `Get a ${singular} by id`, ...sec(opts.getOne),
        parameters: [idParam(idName, Cap)],
        responses: {
          200: ok(Cap, { $ref: outputRef }),
          400: err('Invalid id'),
          ...(opts.getOne === 'public' ? {} : { 401: err('Not logged in'), 403: err(opts.owner) }),
          404: err(`${Cap} not found`), 500: err('Server error')
        }
      },
      put: {
        tags: [tag], summary: `Update a ${singular} (full replace of fields)`, description: `Requires login. ${opts.owner}.${notes}`,
        security: secured, parameters: [idParam(idName, Cap)], requestBody: json(inputRef),
        responses: {
          200: ok(`${Cap} updated`, msg({ [singular]: { $ref: outputRef } })),
          400: err('Validation failed or invalid id'),
          ...mut({}), 404: err(`${Cap} not found`),
          ...(tag === 'Users' ? { 409: err('Duplicate githubId or username') } : {}),
          500: err('Server error')
        }
      },
      delete: {
        tags: [tag], summary: `Delete a ${singular}`, description: `Requires login. ${opts.owner}.`,
        security: secured, parameters: [idParam(idName, Cap)],
        responses: {
          200: ok(`${Cap} deleted`, msg()),
          400: err('Invalid id'), ...mut({}), 404: err(`${Cap} not found`), 500: err('Server error')
        }
      }
    }
  };
}

const userInput = {
  type: 'object', required: ['githubId', 'username', 'email'],
  properties: {
    githubId: { type: 'string', example: '1234567' },
    username: { type: 'string', example: 'andrea-g' },
    displayName: { type: 'string', example: 'Andrea González' },
    email: { type: 'string', format: 'email', example: 'andrea@example.com' },
    avatarUrl: { type: 'string', format: 'uri', example: 'https://avatars.githubusercontent.com/u/1234567' },
    role: { type: 'string', enum: ['user', 'admin'], default: 'user', description: 'Only admins can change this.' }
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
    tags: { type: 'array', items: { type: 'string' }, example: ['dinner', 'spicy'] }
  }
};
const mealPlanInput = {
  type: 'object', required: ['title', 'startDate', 'endDate'],
  properties: {
    title: { type: 'string', example: 'Week of Oct 12' },
    startDate: { type: 'string', format: 'date', example: '2026-10-12' },
    endDate: { type: 'string', format: 'date', example: '2026-10-18', description: 'Must be on or after startDate' },
    meals: {
      type: 'array',
      items: {
        type: 'object', required: ['date', 'mealType', 'recipeId'],
        properties: {
          date: { type: 'string', format: 'date', example: '2026-10-12' },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          recipeId: { type: 'string', description: 'ObjectId of an existing recipe', example: '652f1c2e8a1b2c3d4e5f6a7b' }
        }
      }
    },
    notes: { type: 'string', example: 'Cook in bulk on Sunday' }
  }
};
const groceryListInput = {
  type: 'object', required: ['title', 'items'],
  properties: {
    title: { type: 'string', example: 'Weekly shop' },
    mealPlanId: { type: 'string', description: 'Optional ObjectId of one of your meal plans', example: '652f1c2e8a1b2c3d4e5f6a7b' },
    items: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string', example: 'pasta' },
          quantity: { type: 'number', example: 2 },
          unit: { type: 'string', example: 'kg' },
          checked: { type: 'boolean', default: false }
        }
      }
    },
    status: { type: 'string', enum: ['active', 'completed'], default: 'active' }
  }
};
const withMeta = (input, extra) => ({ type: 'object', properties: { _id: { type: 'string' }, ...input.properties, ...extra } });
const dt = { type: 'string', format: 'date-time' };
const stamps = { createdAt: dt, updatedAt: dt };

const authPaths = {
  '/auth/github': {
    get: {
      tags: ['Auth'], summary: 'Log in with GitHub (OAuth 2.0)',
      description: 'Open this URL in the browser (not "Try it out"): it redirects to GitHub, then back to the API with a session cookie.',
      responses: { 302: { description: 'Redirect to GitHub' } }
    }
  },
  '/auth/github/callback': {
    get: {
      tags: ['Auth'], summary: 'GitHub OAuth callback (used by GitHub)',
      responses: { 302: { description: 'Redirect to /auth/me on success, /auth/failure on failure' } }
    }
  },
  '/auth/me': {
    get: {
      tags: ['Auth'], summary: 'Get the logged-in user', security: secured,
      responses: { 200: ok('Current user', { $ref: '#/components/schemas/User' }), 401: err('Not logged in') }
    }
  },
  '/auth/logout': {
    get: {
      tags: ['Auth'], summary: 'Log out (ends the session)',
      responses: { 200: ok('Logged out', msg()), 500: err('Server error') }
    }
  }
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Meal Compass API',
    version: '2.0.0',
    description: 'REST API for planning weekly meals: users, recipes, meal plans and grocery lists with full CRUD.\n\n' +
      '**Authentication:** log in by opening `/auth/github` in your browser (GitHub OAuth). The session cookie is then sent automatically, so "Try it out" works for protected routes. ' +
      'Without it, protected routes return 401. Users can only change their own data (403 otherwise); admins can change anything.'
  },
  servers: [{ url: '/', description: 'Current host (localhost or Render)' }],
  tags: [{ name: 'Auth' }, { name: 'Users' }, { name: 'Recipes' }, { name: 'Meal Plans' }, { name: 'Grocery Lists' }],
  paths: {
    ...authPaths,
    ...crud('Users', 'users', 'user', 'userId', '#/components/schemas/UserInput', '#/components/schemas/User', {
      get: 'admin', getOne: 'login', post: 'admin', owner: 'Only the user themself or an admin',
      listDesc: 'Admin only (profiles contain personal data).'
    }),
    ...crud('Recipes', 'recipes', 'recipe', 'recipeId', '#/components/schemas/RecipeInput', '#/components/schemas/Recipe', {
      get: 'public', getOne: 'public', post: 'login', owner: 'Only the recipe creator or an admin',
      listDesc: 'Public – no login needed.', notes: 'The creator (createdBy) is set from the logged-in user.'
    }),
    ...crud('Meal Plans', 'meal-plans', 'mealPlan', 'mealPlanId', '#/components/schemas/MealPlanInput', '#/components/schemas/MealPlan', {
      get: 'login', getOne: 'login', post: 'login', owner: 'Only the plan owner or an admin',
      listDesc: 'Returns only your own plans (admins see all).', notes: 'Every meal must reference an existing recipe.'
    }),
    ...crud('Grocery Lists', 'grocery-lists', 'groceryList', 'groceryListId', '#/components/schemas/GroceryListInput', '#/components/schemas/GroceryList', {
      get: 'login', getOne: 'login', post: 'login', owner: 'Only the list owner or an admin',
      listDesc: 'Returns only your own lists (admins see all).', notes: 'If mealPlanId is given it must be one of your meal plans.'
    })
  },
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'connect.sid', description: 'Session cookie set after GitHub login' } },
    schemas: {
      UserInput: userInput,
      User: withMeta(userInput, { createdAt: dt, lastLoginAt: { ...dt, nullable: true } }),
      RecipeInput: recipeInput,
      Recipe: withMeta(recipeInput, { createdBy: { type: 'string' }, ...stamps }),
      MealPlanInput: mealPlanInput,
      MealPlan: withMeta(mealPlanInput, { userId: { type: 'string' }, ...stamps }),
      GroceryListInput: groceryListInput,
      GroceryList: withMeta(groceryListInput, { userId: { type: 'string' }, ...stamps }),
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } }
        }
      }
    }
  }
};

fs.writeFileSync(__dirname + '/swagger.json', JSON.stringify(spec, null, 2));
console.log('swagger.json generated');
