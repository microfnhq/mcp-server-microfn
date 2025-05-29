import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface WorkspaceInfo {
  id: string;
  name: string;
  description?: string;
}

export class WorkspaceCache {
  private static CACHE_KEY = 'cachedWorkspaces';
  private static TIMESTAMP_KEY = 'cachedWorkspacesTimestamp';
  private static CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private storage: DurableObjectStorage,
    private toolsToUpdate: Map<string, RegisteredTool>
  ) {
    console.log('[WorkspaceCache] Initialized with', toolsToUpdate.size, 'tools to update');
  }

  async updateCache(workspaces: WorkspaceInfo[]): Promise<void> {
    console.log('[WorkspaceCache] Updating cache with', workspaces.length, 'workspaces');
    console.log('[WorkspaceCache] Workspaces:', JSON.stringify(workspaces));
    
    await this.storage.put(WorkspaceCache.CACHE_KEY, workspaces);
    await this.storage.put(WorkspaceCache.TIMESTAMP_KEY, Date.now());
    
    console.log('[WorkspaceCache] Cache updated successfully');
    
    // Update tool descriptions
    this.updateToolDescriptions(workspaces);
  }

  async getCached(): Promise<WorkspaceInfo[] | null> {
    console.log('[WorkspaceCache] Attempting to read from cache...');
    
    const cached = await this.storage.get<WorkspaceInfo[]>(WorkspaceCache.CACHE_KEY);
    const timestamp = await this.storage.get<number>(WorkspaceCache.TIMESTAMP_KEY);
    
    console.log('[WorkspaceCache] Cache read result:', {
      hasCached: !!cached,
      cachedCount: cached?.length || 0,
      timestamp: timestamp,
      age: timestamp ? Date.now() - timestamp : null,
      expired: timestamp ? Date.now() - timestamp > WorkspaceCache.CACHE_DURATION_MS : null
    });
    
    if (cached && timestamp && Date.now() - timestamp < WorkspaceCache.CACHE_DURATION_MS) {
      console.log('[WorkspaceCache] Returning', cached.length, 'cached workspaces');
      return cached;
    }
    
    console.log('[WorkspaceCache] Cache miss or expired');
    return null;
  }

  updateToolDescriptions(workspaces: WorkspaceInfo[]): void {
    console.log('[WorkspaceCache] updateToolDescriptions called with', workspaces.length, 'workspaces');
    console.log('[WorkspaceCache] Tools to update:', Array.from(this.toolsToUpdate.keys()));
    
    if (workspaces.length === 0) {
      console.log('[WorkspaceCache] No workspaces to update descriptions with');
      return;
    }

    const functionList = workspaces
      .map(ws => `  - ${ws.name} (${ws.id})`)
      .join('\n');

    // Update executeFunction tool
    const executeTool = this.toolsToUpdate.get('executeFunction');
    if (executeTool) {
      const newDesc = `Execute a function with given input. Requires functionId and optional inputData parameters.\n\nAvailable functions:\n${functionList}`;
      console.log('[WorkspaceCache] Updating executeFunction description');
      executeTool.update({ description: newDesc });
    } else {
      console.log('[WorkspaceCache] executeFunction tool not found in toolsToUpdate');
    }

    // Update getFunctionCode tool
    const getCodeTool = this.toolsToUpdate.get('getFunctionCode');
    if (getCodeTool) {
      const newDesc = `Get the source code of a function. Requires functionId parameter.\n\nAvailable functions:\n${functionList}`;
      console.log('[WorkspaceCache] Updating getFunctionCode description');
      getCodeTool.update({ description: newDesc });
    } else {
      console.log('[WorkspaceCache] getFunctionCode tool not found in toolsToUpdate');
    }

    // Update other tools as needed...
    console.log('[WorkspaceCache] Tool descriptions updated');
  }
}