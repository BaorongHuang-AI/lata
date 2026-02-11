// src/renderer/services/database.service.ts

import type { Document, DocumentMetadata, DocumentWithMetadata } from '../../types/database';
const { contextBridge, ipcRenderer } = require('electron');
class DatabaseAPI {
    // ==================== Documents ====================

    async createDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
        return ipcRenderer.invoke('db:createDocument', doc);
    }

    async getDocument(id: number): Promise<Document | null> {
        return ipcRenderer.invoke('db:getDocument', id);
    }

    async getDocumentWithMetadata(id: number): Promise<DocumentWithMetadata | null> {
        return ipcRenderer.invoke('db:getDocumentWithMetadata', id);
    }

    async getAllDocuments(): Promise<Document[]> {
        return ipcRenderer.invoke('db:getAllDocuments');
    }

    async updateDocument(id: number, updates: Partial<Document>): Promise<void> {
        await ipcRenderer.invoke('db:updateDocument', id, updates);
    }

    async deleteDocument(id: number): Promise<void> {
        await ipcRenderer.invoke('db:deleteDocument', id);
    }

    // ==================== Metadata ====================

    async upsertMetadata(metadata: Omit<DocumentMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
        await ipcRenderer.invoke('db:upsertMetadata', metadata);
    }

    async getMetadata(documentId: number, type: 'source' | 'target'): Promise<DocumentMetadata | null> {
        return ipcRenderer.invoke('db:getMetadata', documentId, type);
    }

    // ==================== Combined Operations ====================

    async saveDocumentWithMetadata(data: {
        document: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        sourceMetadata?: Partial<DocumentMetadata>;
        targetMetadata?: Partial<DocumentMetadata>;
    }): Promise<number> {
        return ipcRenderer.invoke('db:saveDocumentWithMetadata', data);
    }

    async updateDocumentWithMetadata(id: number, data: {
        document?: Partial<Document>;
        sourceMetadata?: Partial<DocumentMetadata>;
        targetMetadata?: Partial<DocumentMetadata>;
    }): Promise<void> {
        await ipcRenderer.invoke('db:updateDocumentWithMetadata', id, data);
    }

    // ==================== Search ====================

    async searchDocuments(query: string): Promise<Document[]> {
        return ipcRenderer.invoke('db:searchDocuments', query);
    }

    // ==================== Files ====================

    async addDocumentFile(file: any): Promise<number> {
        return ipcRenderer.invoke('db:addDocumentFile', file);
    }

    async getDocumentFiles(documentId: number): Promise<any[]> {
        return ipcRenderer.invoke('db:getDocumentFiles', documentId);
    }

    async deleteDocumentFile(id: number): Promise<void> {
        await ipcRenderer.invoke('db:deleteDocumentFile', id);
    }
}

export default new DatabaseAPI();