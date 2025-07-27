# E-Learning UI

Frontend application for the E-Learning platform.

## Environment Variables

This application uses environment variables for configuration. To set up:

1. Create a `.env` file in the root directory (`e-learning-ui/`) with the following variables:

```
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
```

2. Adjust the `VITE_API_BASE_URL` to point to your backend API.
   - For local development, the default value works with the local Django backend
   - For production, use your deployed API endpoint

Note: In Vite, all environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

## Development

1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm run dev
```

## Building for Production

```
npm run build
```

The built files will be in the `dist` directory.
