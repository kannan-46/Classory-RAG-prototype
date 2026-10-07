import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, SearchVectorsCommand } from '@aws-sdk/client-dynamodb';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  // Initialize AWS SDK clients
  private bedrock = new BedrockRuntimeClient({ region: 'ap-south-1' });
  private db = new DynamoDBClient({ region: 'ap-south-1' });

  private readonly tableName = 'ClassoryRAG';
  private readonly indexName = 'VectorSearchIndex';

  async handleStudentQuery(tenantId: string, queryText: string) {
    try {
      // Step 1: Generate Embedding via Titan Text V2
      console.log(`Generating embedding for query: "${queryText}"`);
      const embedCommand = new InvokeModelCommand({
        modelId: 'amazon.titan-embed-text-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: queryText,
          dimensions: 1024,
          normalize: true,
        }),
      });

      const embedRes = await this.bedrock.send(embedCommand);
      const embedding = JSON.parse(new TextDecoder().decode(embedRes.body))
        .embedding as number[];

      // Step 2: Native Vector Search in DynamoDB
      console.log(`Searching DynamoDB Vector Index for tenant: ${tenantId}`);
      const searchCommand = new SearchVectorsCommand({
        TableName: this.tableName,
        IndexName: this.indexName,
        // The SearchSchema HASH attribute (tenantId) is mandatory for partitioned searches
        SearchConditionExpression: 'tenantId = :tenantId',
        ExpressionAttributeValues: {
          ':tenantId': { S: tenantId },
        },
        SearchVector: embedding.map((value) => ({ N: value.toString() })),
        TopK: 3, // Keep modest to respect the 16MB payload limit
      });

      const searchRes = await this.db.send(searchCommand);
      const searchResults = searchRes.SearchResults ?? [];

      // Extract the projected 'contentChunk' text from the results
      const retrievedChunks = searchResults.length
        ? searchResults
            .map((result) => result.Item?.contentChunk?.S)
            .filter((content): content is string => content !== undefined)
            .join('\n\n---\n\n')
        : 'No relevant course materials found.';

      // Step 3: Generate Final Answer via Nova Micro
      this.logger.log(`Generating final response with Amazon Nova Micro`);
      const converseCommand = new ConverseCommand({
        modelId: 'amazon.nova-micro-v1:0',
        system: [
          {
            text: "You are a helpful teaching assistant for Classory. Answer the student's question using ONLY the provided course context. If the answer is not in the context, say so.",
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                text: `Course Context:\n${retrievedChunks}\n\nStudent Question:\n${queryText}`,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: 500,
          temperature: 0.1, // Low temperature forces strict adherence to the retrieved context
        },
      });

      const novaRes = await this.bedrock.send(converseCommand);

      return {
        answer: novaRes.output?.message?.content?.[0]?.text,
        sourcesRetrieved: searchResults.length,
      };
    } catch (error) {
      this.logger.error('Error processing RAG query', error);
      throw new Error('Failed to process student query');
    }
  }
}
