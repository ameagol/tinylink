<img width="1040" height="501" alt="image" src="https://github.com/user-attachments/assets/a12f47ea-8a28-497d-8862-792dcfc41361" />


# Tiny My URl

This is a web application that allows users to shorten and customize slug URLs and track the number of hits for each shortened slug.

## Features

* Custom or random slug generation for shortened URLs
* Table view of all URLs with:

  * Slug link
  * Original URL
  * Number of hits
  * Owner
* Visual dashboard showing hits per slug as a bar chart
* Simple login form for demonstration purposes

## Preview

A preview of the interface includes:

* A left-aligned table of shortened URLs
* A right-aligned dashboard showing hit statistics

## Technologies Used

* **Frontend**: React, HTML, CSS
* **Backend**: Node.js with Express
* **State Management**: React useState/useEffect

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/ameagol/tinylink
cd tinyurl
```

2. Install dependencies:

```bash
serve/npm install
client/npm install
```

3. Run the app locally:

```bash
docker compose up --build
```

4. Open your browser at `http://localhost:3000`

## Possible Improvements

* Move Login to a SQL database with JWT
* Use Real Sessions
* Add API Gateway or BFF between Front and Back

## License

MIT License

## Author

Developed by Ricardo Gellman
