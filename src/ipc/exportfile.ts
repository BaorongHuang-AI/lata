import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

ipcMain.handle('save-ces-alignment-zip', async (event, { sourceDocXml, targetDocXml, alignXml, sourceDocFilename, targetDocFilename }) => {
    const result = await dialog.showSaveDialog({
        title: 'Save CES Alignment',
        defaultPath: 'ces_alignment.zip',
        filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    });

    if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
    }

    try {
        // Create zip in main process
        const zip = new JSZip();
        zip.file(sourceDocFilename, sourceDocXml);
        zip.file(targetDocFilename, targetDocXml);
        zip.file('alignment.xml', alignXml);

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(result.filePath, zipBuffer);

        return { success: true, filePath: result.filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});