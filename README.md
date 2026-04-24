# SRM Full Stack Engineering Challenge

Production-ready implementation for the SRM `POST /bfhl` challenge using:
- Backend: Express (`backend`)
- Frontend: React + Vite (`frontend`)

## Project Structure

- `backend`: BFHL API implementation, validation, hierarchy builder, tests
- `frontend`: Single-page client to submit input and visualize responses

## Backend Setup

```bash
cd backend
cp .env.example .env
```

Update `.env` with real values:
- `USER_ID` format: `fullname_ddmmyyyy`
- `EMAIL_ID`: your college email
- `COLLEGE_ROLL_NUMBER`: your roll number

Run backend:

```bash
npm install
npm run dev
```

Backend URL: `http://localhost:3000`

## Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## API Contract

- Endpoint: `POST /bfhl`
- Content-Type: `application/json`
- Request body:

```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

Response includes:
- identity fields (`user_id`, `email_id`, `college_roll_number`)
- `hierarchies`
- `invalid_entries`
- `duplicate_edges`
- `summary`

## Verification

Backend tests:

```bash
cd backend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Deployment

- Deploy backend to Render/Railway/Vercel as Node service
- Set backend env vars from `backend/.env.example`
- Deploy frontend to Vercel/Netlify
- Set `VITE_API_BASE_URL` to deployed backend base URL
- Ensure backend `CORS_ORIGIN` allows deployed frontend origin

Submission artifacts:
- Hosted API base URL (`<base>/bfhl`)
- Hosted frontend URL
- Public GitHub repository URL
