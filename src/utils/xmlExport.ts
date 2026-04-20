// src/utils/xmlExport.ts
import type { AlignmentMetadata, Line, Link } from '../types/alignment';
import {DocumentMeta} from "../types/database";
import {DocumentMetadata} from "./AlignUtils";
import JSZip from 'jszip';

//
//
//
// export const generateCESAlignXML = (
//     sourceMeta: DocumentMetadata,
//     targetMeta: DocumentMetadata,
//     sourceLines: Line[],
//     targetLines: Line[],
//     links: Link[]
// ): string => {
//     console.log(sourceLines, targetLines, links);
//     const escapeXml = (str: string) => {
//         return str
//             .replace(/&/g, '&amp;')
//             .replace(/</g, '&lt;')
//             .replace(/>/g, '&gt;')
//             .replace(/"/g, '&quot;')
//             .replace(/'/g, '&apos;');
//     };
//
//     let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
//     xml += '<cesAlign version="1.0">\n';
//     xml += '  <cesHeader>\n';
//     xml += '    <fileDesc>\n';
//     xml += '      <titleStmt>\n';
//     xml += `        <h.title xml:lang="${escapeXml(sourceMeta.language)}">${escapeXml(
//         sourceMeta.title
//     )}</h.title>\n`;
//     xml += `        <h.title xml:lang="${escapeXml(targetMeta.language)}">${escapeXml(
//         targetMeta.title
//     )}</h.title>\n`;
//     xml += '      </titleStmt>\n';
//     xml += '      <sourceDesc>\n';
//
//     if (sourceMeta.source) {
//         xml += `        <p>Source: ${escapeXml(sourceMeta.source)}</p>\n`;
//     }
//     if (sourceMeta.domain) {
//         xml += `        <p>Domain: ${escapeXml(sourceMeta.domain)}</p>\n`;
//     }
//     // if (metadata.strategyProfile) {
//     //     xml += `        <p>Strategy Profile: ${escapeXml(metadata.strategyProfile)}</p>\n`;
//     // }
//
//     xml += '      </sourceDesc>\n';
//     xml += '      <targetDesc>\n';
//
//     if (targetMeta.source) {
//         xml += `        <p>Source: ${escapeXml(targetMeta.source)}</p>\n`;
//     }
//     if (targetMeta.domain) {
//         xml += `        <p>Domain: ${escapeXml(targetMeta.domain)}</p>\n`;
//     }
//     // if (metadata.strategyProfile) {
//     //     xml += `        <p>Strategy Profile: ${escapeXml(metadata.strategyProfile)}</p>\n`;
//     // }
//
//     xml += '      </targetDesc>\n';
//     xml += '    </fileDesc>\n';
//     xml += '  </cesHeader>\n\n';
//
//     xml += `  <linkGrp type="sent" fromDoc="${escapeXml(metadata.sourceDoc)}" toDoc="${escapeXml(
//         metadata.targetDoc
//     )}">\n`;
//     const sortedLinks = [...links].sort((a, b) => {
//         const firstSourceA = a.sourceIds[0] || '';
//         const firstSourceB = b.sourceIds[0] || '';
//         return firstSourceA.localeCompare(firstSourceB);
//     });
//
//     sortedLinks.forEach((link) => {
//         const sourceLineNumbers = link.sourceIds
//             .map((id) => {
//                 const line = sourceLines.find((l) => l.id === id);
//                 return line?.lineNumber || id;
//             })
//             .join(' ');
//
//         const targetLineNumbers = link.targetIds
//             .map((id) => {
//                 const line = targetLines.find((l) => l.id === id);
//                 return line?.lineNumber || id;
//             })
//             .join(' ');
//
//         xml += `    <link xtargets="${escapeXml(sourceLineNumbers)} ; ${escapeXml(
//             targetLineNumbers
//         )}">\n`;
//
//         if (link.strategy) {
//             xml += `      <desc type="strategy">${escapeXml(link.strategy)}</desc>\n`;
//         }
//         if (link.comment) {
//             xml += `      <desc type="user_comment">${escapeXml(link.comment)}</desc>\n`;
//         }
//
//         xml += `      <desc type="confidence">${(link.confidence * 100).toFixed(0)}%</desc>\n`;
//
//         if (link.isFavorite) {
//             xml += `      <desc type="favorite">true</desc>\n`;
//         }
//
//         xml += '    </link>\n';
//     });
//
//     xml += '  </linkGrp>\n';
//     xml += '</cesAlign>';
//
//     return xml;
// };
//
// export const downloadXML = (xmlContent: string, filename: string = 'alignment.xml') => {
//     const blob = new Blob([xmlContent], { type: 'application/xml' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
// };
//
//
// export const generateCESDocument = (
//     meta: DocumentMetadata,
//     lines: Line[],
//     lang: 'source' | 'target'
// ): string => {
//     const escapeXml = (str: string) => {
//         return str
//             .replace(/&/g, '&amp;')
//             .replace(/</g, '&lt;')
//             .replace(/>/g, '&gt;')
//             .replace(/"/g, '&quot;')
//             .replace(/'/g, '&apos;');
//     };
//
//     // Group lines by paragraph ID (extract 'p' from 'sp2-s0' -> 'p2')
//     const paragraphs = new Map<string, Line[]>();
//
//     lines.forEach((line) => {
//         // Extract paragraph ID from lineNumber (e.g., "sp2-s0" -> "p2")
//         const match = line.lineNumber.match(/s(p\d+)-s\d+/);
//         const paragraphId = match ? match[1] : 'p1'; // default to 'p1' if no match
//
//         if (!paragraphs.has(paragraphId)) {
//             paragraphs.set(paragraphId, []);
//         }
//         paragraphs.get(paragraphId)!.push(line);
//     });
//
//     let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
//     xml += '<cesDoc version="1.0">\n';
//     xml += '  <cesHeader>\n';
//     xml += '    <fileDesc>\n';
//     xml += '      <titleStmt>\n';
//     xml += `        <title xml:lang="${escapeXml(meta.language)}">${escapeXml(meta.title)}</title>\n`;
//     xml += '      </titleStmt>\n';
//
//     if (meta.source || meta.domain) {
//         xml += '      <sourceDesc>\n';
//         if (meta.source) {
//             xml += `        <p>Source: ${escapeXml(meta.source)}</p>\n`;
//         }
//         if (meta.domain) {
//             xml += `        <p>Domain: ${escapeXml(meta.domain)}</p>\n`;
//         }
//         xml += '      </sourceDesc>\n';
//     }
//
//     xml += '    </fileDesc>\n';
//     xml += '  </cesHeader>\n\n';
//
//     xml += '  <body>\n';
//
//     // Iterate through paragraphs
//     paragraphs.forEach((paragraphLines, paragraphId) => {
//         xml += `    <p id="${escapeXml(paragraphId)}">\n`;
//
//         paragraphLines.forEach((line) => {
//             xml += `      <s id="${escapeXml(line.lineNumber)}"`;
//
//             if (line.isFavorite) {
//                 xml += ' favorite="true"';
//             }
//
//             xml += '>\n';
//             xml += `        ${escapeXml(line.text)}\n`;
//
//             if (line.comment) {
//                 xml += `        <note type="comment">${escapeXml(line.comment)}</note>\n`;
//             }
//
//             xml += '      </s>\n';
//         });
//
//         xml += '    </p>\n';
//     });
//
//     xml += '  </body>\n';
//     xml += '</cesDoc>';
//
//     return xml;
// };


export const generateCESAlignXML = (
    sourceMeta: DocumentMetadata,
    targetMeta: DocumentMetadata,
    sourceLines: Line[],
    targetLines: Line[],
    links: Link[]
): string => {
    console.log(sourceLines, targetLines, links);
    const escapeXml = (str: string) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<cesAlign version="1.0">\n';
    xml += '  <cesHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += `        <h.title xml:lang="${escapeXml(sourceMeta.language)}">${escapeXml(
        sourceMeta.title
    )}</h.title>\n`;
    xml += `        <h.title xml:lang="${escapeXml(targetMeta.language)}">${escapeXml(
        targetMeta.title
    )}</h.title>\n`;
    xml += '      </titleStmt>\n';
    xml += '      <sourceDesc>\n';

    if (sourceMeta.source) {
        xml += `        <p>Source: ${escapeXml(sourceMeta.source)}</p>\n`;
    }
    if (sourceMeta.domain) {
        xml += `        <p>Domain: ${escapeXml(sourceMeta.domain)}</p>\n`;
    }

    xml += '      </sourceDesc>\n';
    xml += '      <targetDesc>\n';

    if (targetMeta.source) {
        xml += `        <p>Source: ${escapeXml(targetMeta.source)}</p>\n`;
    }
    if (targetMeta.domain) {
        xml += `        <p>Domain: ${escapeXml(targetMeta.domain)}</p>\n`;
    }

    xml += '      </targetDesc>\n';
    xml += '    </fileDesc>\n';
    xml += '  </cesHeader>\n\n';

    // Extract sourceDoc and targetDoc filenames
    const sourceDoc = `${sourceMeta.language}_${sourceMeta.title.replace(/\s+/g, '_')}.xml`;
    const targetDoc = `${targetMeta.language}_${targetMeta.title.replace(/\s+/g, '_')}.xml`;

    xml += `  <linkGrp type="sent" fromDoc="${escapeXml(sourceDoc)}" toDoc="${escapeXml(
        targetDoc
    )}">\n`;

    const extractKey = (id) => {
        // Extract numbers for stable ordering (e.g. tp7-s12 → 7, 12)
        const match = id.match(/(\d+)/g);
        if (!match) return [id];

        return match.map(Number);
    };

    const compareNatural = (a, b) => {
        const aId = a.sourceIds?.[0] || '';
        const bId = b.sourceIds?.[0] || '';

        const aKey = extractKey(aId);
        const bKey = extractKey(bId);

        const len = Math.max(aKey.length, bKey.length);

        for (let i = 0; i < len; i++) {
            const av = aKey[i] ?? 0;
            const bv = bKey[i] ?? 0;

            if (av !== bv) return av - bv;
        }

        return aId.localeCompare(bId);
    };

    const sortedLinks = [...links].sort(compareNatural);

    // const sortedLinks = [...links].sort((a, b) => {
    //     const firstSourceA = a.sourceIds[0] || '';
    //     const firstSourceB = b.sourceIds[0] || '';
    //     return firstSourceA.localeCompare(firstSourceB);
    // });

    sortedLinks.forEach((link) => {
        const sourceLineNumbers = link.sourceIds
            .map((id) => {
                const line = sourceLines.find((l) => l.id === id);
                return line?.lineNumber || id;
            })
            .join(' ');

        const targetLineNumbers = link.targetIds
            .map((id) => {
                const line = targetLines.find((l) => l.id === id);
                return line?.lineNumber || id;
            })
            .join(' ');

        xml += `    <link xtargets="${escapeXml(sourceLineNumbers)} ; ${escapeXml(
            targetLineNumbers
        )}">\n`;

        if (link.strategy) {
            xml += `      <desc type="strategy">${escapeXml(link.strategy)}</desc>\n`;
        }
        if (link.comment) {
            xml += `      <desc type="user_comment">${escapeXml(link.comment)}</desc>\n`;
        }

        xml += `      <desc type="confidence">${(link.confidence * 100).toFixed(0)}%</desc>\n`;

        if (link.isFavorite) {
            xml += `      <desc type="favorite">true</desc>\n`;
        }

        xml += '    </link>\n';
    });

    xml += '  </linkGrp>\n';
    xml += '</cesAlign>';

    return xml;
};

export const generateCESDocument = (
    meta: DocumentMetadata,
    lines: Line[],
    lang: 'source' | 'target'
): string => {
    const escapeXml = (str: string) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    // Group lines by paragraph ID (extract 'p' from 'sp2-s0' -> 'p2' or 'tp2-s0' -> 'p2')
    const paragraphs = new Map<string, Line[]>();

    lines.forEach((line) => {
        // Extract paragraph ID from lineNumber (e.g., "sp2-s0" -> "p2" or "tp2-s0" -> "p2")
        const match = line.lineNumber.match(/[st](p\d+)-s\d+/);
        const paragraphId = match ? match[1] : 'p1'; // default to 'p1' if no match

        if (!paragraphs.has(paragraphId)) {
            paragraphs.set(paragraphId, []);
        }
        paragraphs.get(paragraphId)!.push(line);
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<cesDoc version="1.0">\n';
    xml += '  <cesHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += `        <title xml:lang="${escapeXml(meta.language)}">${escapeXml(meta.title)}</title>\n`;
    xml += '      </titleStmt>\n';

    if (meta.source || meta.domain) {
        xml += '      <sourceDesc>\n';
        if (meta.source) {
            xml += `        <p>Source: ${escapeXml(meta.source)}</p>\n`;
        }
        if (meta.domain) {
            xml += `        <p>Domain: ${escapeXml(meta.domain)}</p>\n`;
        }
        xml += '      </sourceDesc>\n';
    }

    xml += '    </fileDesc>\n';
    xml += '  </cesHeader>\n\n';

    xml += '  <body>\n';

    // Iterate through paragraphs in sorted order
    const sortedParagraphs = Array.from(paragraphs.entries()).sort((a, b) => {
        return a[0].localeCompare(b[0]);
    });

    sortedParagraphs.forEach(([paragraphId, paragraphLines]) => {
        xml += `    <p id="${escapeXml(paragraphId)}">\n`;

        paragraphLines.forEach((line) => {
            xml += `      <s id="${escapeXml(line.lineNumber)}"`;

            if (line.isFavorite) {
                xml += ' favorite="true"';
            }

            xml += '>\n';
            xml += `        ${escapeXml(line.text)}\n`;

            if (line.comment) {
                xml += `        <note type="comment">${escapeXml(line.comment)}</note>\n`;
            }

            xml += '      </s>\n';
        });

        xml += '    </p>\n';
    });

    xml += '  </body>\n';
    xml += '</cesDoc>';

    return xml;
};

export const downloadCESAlignmentZip = async (
    sourceMeta: DocumentMetadata,
    targetMeta: DocumentMetadata,
    sourceLines: Line[],
    targetLines: Line[],
    links: Link[]
) => {
    // Generate the three XML files as strings
    const sourceDocXml = generateCESDocument(sourceMeta, sourceLines, 'source');
    const targetDocXml = generateCESDocument(targetMeta, targetLines, 'target');
    const alignXml = generateCESAlignXML(sourceMeta, targetMeta, sourceLines, targetLines, links);

    // Create filenames
    const sourceDocFilename = `${sourceMeta.language}_${sourceMeta.title.replace(/\s+/g, '_')}.xml`;
    const targetDocFilename = `${targetMeta.language}_${targetMeta.title.replace(/\s+/g, '_')}.xml`;

    // Send to main process for ZIP creation
    const result = await window.api.saveCESAlignmentZip({
        sourceDocXml,
        targetDocXml,
        alignXml,
        sourceDocFilename,
        targetDocFilename
    });

    if (result.success) {
        console.log('File saved successfully to:', result.filePath);
        return result;
    } else if (result.canceled) {
        console.log('Save canceled by user');
        return result;
    } else {
        console.error('Error saving file:', result.error);
        throw new Error(result.error);
    }
};