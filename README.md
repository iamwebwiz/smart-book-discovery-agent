# Smart Book Discovery Agent

A TypeScript automation tool for scraping book data from BookDP.com.au based on thematic keywords, enriching it with AI, calculating cost information, and sending the results to a productivity tool via Make.com.

## Features

- **Web Scraping**: Automates searches on BookDP.com.au and extracts book information from the first two pages of results.
- **AI Enrichment**: Uses OpenAI to generate book summaries and relevance scores.
- **Cost Analysis**: Calculates discount amounts, percentages, and value scores for each book.
- **RESTful API**: Provides endpoints for initiating scrapes, checking job status, and retrieving results.
- **Make.com Integration**: Sends the enriched data to a Make.com webhook for further processing.

## Prerequisites

- Node.js (v20+)
- npm or yarn
- OpenAI API Key
- Make.com account with a webhook

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/smart-book-discovery-agent.git
   cd smart-book-discovery-agent
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file with your configurations:

   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key
   MAKE_WEBHOOK_URL=your_make_webhook_url
   ```

4. Build the application:
   ```
   npm run build
   ```

## Running the Application

Start the application:

```
npm start
```

For development with automatic restart:

```
npm run dev
```

## API Endpoints

### 1. Start a Scraping Job

**POST /scrape**

Request body:

```json
{
  "theme": "climate change"
}
```

Response:

```json
{
  "status": "success",
  "message": "Job initiated successfully",
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 2. Check Job Status

**GET /status/:jobId**

Response:

```json
{
  "status": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "theme": "climate change",
    "createdAt": "2023-05-01T12:00:00.000Z",
    "message": "Enriching books with AI analysis..."
  }
}
```

### 3. Get Job Results

**GET /results/:jobId**

Response:

```json
{
  "status": "success",
  "data": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "theme": "climate change",
    "books": [...],
    "timestamp": "2023-05-01T12:05:00.000Z",
    "metadata": {
      "totalBooks": 45,
      "averagePrice": 24.95,
      "averageRelevance": 78.5,
      "mostRelevantBook": "Climate Change: What Everyone Needs to Know",
      "bestValueBook": "This Changes Everything"
    }
  }
}
```

## Docker Support

Build the Docker image:

```bash
docker build -t smart-book-discovery-agent .
```

Run the container:

```bash
docker run -p 3000:3000 --env-file .env smart-book-discovery-agent
```

## Make.com Integration Setup

1. In Make.com, create a new scenario
2. Add a "Webhooks" module as the trigger
3. Configure the webhook to receive data
4. Copy the webhook URL and set it as `MAKE_WEBHOOK_URL` in your `.env` file
5. Add modules to process the data (e.g., Google Sheets, Notion, etc.)

![Make.com Scenario Example](make_scenario_screenshot.png)

### Example Make.com Scenario

Here's an example scenario you can implement:

1. Webhook trigger receives data from the Smart Book Discovery Agent
2. Data is parsed and mapped to the appropriate format
3. For each book, a new row is added to a Google Sheet
4. A summary email is sent with metadata about the results

## Limitations

- The scraper is designed for BookDP.com.au's current website structure and may break if the site is updated.
- Rate limiting may affect the number of books that can be processed in a single job.
- The OpenAI API has usage costs associated with it.

## License

MIT
