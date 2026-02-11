// src/renderer/hooks/useDocument.ts

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dbAPI from '../renderer/services/database.service';
import type { DocumentWithMetadata } from '../types/database';

export function useDocument(documentId?: number) {
    const [document, setDocument] = useState<DocumentWithMetadata | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load document
    const loadDocument = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const doc = await dbAPI.getDocumentWithMetadata(id);
            setDocument(doc);
        } catch (error) {
            console.error('Failed to load document:', error);
            message.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    }, []);

    // Save new document
    const saveDocument = useCallback(async (data: {
        document: any;
        sourceMetadata?: any;
        targetMetadata?: any;
    }) => {
        setSaving(true);
        try {
            const id = await dbAPI.saveDocumentWithMetadata(data);
            message.success('Document saved successfully');
            return id;
        } catch (error) {
            console.error('Failed to save document:', error);
            message.error('Failed to save document');
            throw error;
        } finally {
            setSaving(false);
        }
    }, []);

    // Update existing document
    const updateDocument = useCallback(async (id: number, data: {
        document?: any;
        sourceMetadata?: any;
        targetMetadata?: any;
    }) => {
        setSaving(true);
        try {
            await dbAPI.updateDocumentWithMetadata(id, data);
            message.success('Document updated successfully');

            // Reload document
            if (documentId === id) {
                await loadDocument(id);
            }
        } catch (error) {
            console.error('Failed to update document:', error);
            message.error('Failed to update document');
            throw error;
        } finally {
            setSaving(false);
        }
    }, [documentId, loadDocument]);

    // Delete document
    const deleteDocument = useCallback(async (id: number) => {
        try {
            await dbAPI.deleteDocument(id);
            message.success('Document deleted successfully');
            if (documentId === id) {
                setDocument(null);
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
            message.error('Failed to delete document');
            throw error;
        }
    }, [documentId]);

    // Load on mount if ID provided
    // useEffect(() => {
    //     if (documentId) {
    //         loadDocument(documentId);
    //     }
    // }, [documentId, loadDocument]);

    return {
        document,
        loading,
        saving,
        loadDocument,
        saveDocument,
        updateDocument,
        deleteDocument
    };
}