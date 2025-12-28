'use client';

import * as XLSX from 'xlsx';
import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export function useDataExport() {

    const formatBodyForHtml = (text) => {
        if (!text) return '';
        let html = text;

        // Headings
        html = html.replace(/^###\s+(.*)$/gm, '<h4>$1</h4>');

        // Bold and Italic (***...***)
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        // Bold (**...**)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic (*...*)
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Underline (__...__)
        html = html.replace(/__(.*?)__/g, '<u>$1</u>');

        // Lists
        // Process lists line by line, then wrap them in <ul>
        html = html.replace(/^\*\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

        // Paragraphs and line breaks
        html = html.split('\n\n').map(paragraph => {
            if (paragraph.startsWith('<h4>') || paragraph.startsWith('<ul>')) return paragraph;
            return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    };

    const stripMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/^###\s+/gm, '')
            .replace(/\*\*\*|\*\*|\*|__/g, '');
    };

    const exportData = useCallback((data, filename, format) => {
        switch (format) {
            case 'json':
                const processedJsonData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const jsonBlob = new Blob([JSON.stringify(processedJsonData, null, 2)], {
                    type: 'application/json'
                });
                downloadBlob(jsonBlob, `${filename}.json`);
                break;

            case 'csv':
                const processedCsvData = data.map(note => ({ ...note, body: stripMarkdown(note.body) }));
                const worksheet = XLSX.utils.json_to_sheet(processedCsvData);
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                const csvBlob = new Blob([csv], { type: 'text/csv' });
                downloadBlob(csvBlob, `${filename}.csv`);
                break;

            case 'excel':
                const wb = XLSX.utils.book_new();

                // Main data sheet
                const processedExcelData = data.map(note => ({
                    'Created At': note.created_at,
                    'ID': note.id,
                    'Title': note.title,
                    'Category': note.category || 'None',
                    'Body': stripMarkdown(note.body),
                    'Favorite': note.fav ? '⭐ Yes' : 'No',
                    'Hidden': note.hidden ? '🔒 Yes' : 'No',
                    'Trashed': note.trash ? '🗑️ Yes' : 'No',
                    'Archived': note.archived ? '📦 Yes' : 'No',
                    'Last Updated': note.lastupdated || 'N/A',
                    'Share ID': note.shareid || 'Not shared'
                }));

                const ws = XLSX.utils.json_to_sheet(processedExcelData);

                // Set column widths
                ws['!cols'] = [
                    { wch: 20 }, // Created At
                    { wch: 8 },  // ID
                    { wch: 30 }, // Title
                    { wch: 15 }, // Category
                    { wch: 80 }, // Body
                    { wch: 12 }, // Favorite
                    { wch: 12 }, // Hidden
                    { wch: 12 }, // Trashed
                    { wch: 12 }, // Archived
                    { wch: 20 }, // Last Updated
                    { wch: 25 }  // Share ID
                ];

                XLSX.utils.book_append_sheet(wb, ws, 'Notes');

                // Statistics sheet
                const stats = {
                    'Total Notes': data.length,
                    'Favorites': data.filter(n => n.fav).length,
                    'Hidden': data.filter(n => n.hidden).length,
                    'Trashed': data.filter(n => n.trash).length,
                    'Archived': data.filter(n => n.archived).length,
                    'Shared': data.filter(n => n.shareid).length,
                    'Active Notes': data.filter(n => !n.trash && !n.archived).length
                };

                const categories = {};
                data.forEach(note => {
                    const cat = note.category || 'Uncategorized';
                    categories[cat] = (categories[cat] || 0) + 1;
                });

                const statsData = [
                    ['Metric', 'Count'],
                    ...Object.entries(stats),
                    ['', ''],
                    ['Category Distribution', ''],
                    ...Object.entries(categories)
                ];

                const statsWs = XLSX.utils.aoa_to_sheet(statsData);
                statsWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');

                XLSX.writeFile(wb, `${filename}.xlsx`);
                break;
            case 'pdf':
                const doc = new jsPDF();
                let yPosition = 20;
                const pageHeight = doc.internal.pageSize.height;
                const pageWidth = doc.internal.pageSize.width;
                const margin = 15;
                const contentWidth = pageWidth - (margin * 2);

                // Title page
                doc.setFontSize(24);
                doc.setTextColor(41, 128, 185);
                doc.text('My Notes Export', pageWidth / 2, 30, { align: 'center' });

                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 40, { align: 'center' });
                doc.text(`Total Notes: ${data.length}`, pageWidth / 2, 48, { align: 'center' });

                // Add each note on its own page(s)
                data.forEach((note, index) => {
                    doc.addPage();
                    yPosition = 20;

                    // Note number
                    doc.setFontSize(10);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Note ${index + 1} of ${data.length}`, margin, yPosition);
                    yPosition += 10;

                    // Title
                    doc.setFontSize(16);
                    doc.setTextColor(41, 128, 185);
                    const titleLines = doc.splitTextToSize(note.title || 'Untitled', contentWidth);
                    doc.text(titleLines, margin, yPosition);
                    yPosition += titleLines.length * 8 + 5;

                    // Metadata section
                    doc.setFontSize(9);
                    doc.setTextColor(80, 80, 80);

                    const metadata = [
                        `Created: ${note.created_at}`,
                        `Last Updated: ${note.lastupdated || 'N/A'}`,
                        `Category: ${note.category || 'None'}`,
                        `ID: ${note.id}`,
                        `Share ID: ${note.shareid || 'Not shared'}`,
                        `Status: ${note.fav ? '⭐ Favorite' : ''} ${note.hidden ? '🔒 Hidden' : ''} ${note.trash ? '🗑️ Trashed' : ''} ${note.archived ? '📦 Archived' : ''}`.trim() || 'Active'
                    ];

                    metadata.forEach(line => {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        doc.text(line, margin, yPosition);
                        yPosition += 5;
                    });

                    yPosition += 5;

                    // Separator line
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 8;

                    // Body content
                    doc.setFontSize(10);
                    doc.setTextColor(50, 50, 50);
                    const bodyText = stripMarkdown(note.body || 'No content');
                    const bodyLines = doc.splitTextToSize(bodyText, contentWidth);

                    bodyLines.forEach(line => {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = 20;
                            // Add continuation indicator
                            doc.setFontSize(8);
                            doc.setTextColor(150, 150, 150);
                            doc.text('(continued...)', margin, yPosition);
                            yPosition += 10;
                            doc.setFontSize(10);
                            doc.setTextColor(50, 50, 50);
                        }
                        doc.text(line, margin, yPosition);
                        yPosition += 5;
                    });
                });

                // Add page numbers to all pages
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }

                doc.save('notes.pdf');
                break;
            case 'html':
                // Calculate statistics
                const totalNotes = data.length;
                const favorites = data.filter(n => n.fav).length;
                const hidden = data.filter(n => n.hidden).length;
                const trashed = data.filter(n => n.trash).length;
                const archived = data.filter(n => n.archived).length;
                const shared = data.filter(n => n.shareid).length;
                const active = data.filter(n => !n.trash && !n.archived).length;

                // Category analysis
                const categoryStats = {};
                data.forEach(note => {
                    const cat = note.category || 'Uncategorized';
                    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
                });

                // Timeline analysis
                const notesByDate = {};
                data.forEach(note => {
                    const date = note.created_at.split(',')[0];
                    notesByDate[date] = (notesByDate[date] || 0) + 1;
                });
                const sortedDates = Object.entries(notesByDate).sort((a, b) => new Date(b[0]) - new Date(a[0]));

                // Word count analysis
                const totalWords = data.reduce((sum, note) => {
                    const words = stripMarkdown(note.body).split(/\s+/).filter(w => w.length > 0).length;
                    return sum + words;
                }, 0);
                const avgWords = Math.round(totalWords / data.length);

                const html = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Notes - Complete Export</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Dark theme inspired by shadcn */
        :root {
            --background: 0 0% 3.9%;
            --foreground: 0 0% 98%;
            --card: 0 0% 7%;
            --card-foreground: 0 0% 98%;
            --primary: 263.4 70% 50.4%;
            --primary-foreground: 0 0% 98%;
            --secondary: 240 3.7% 15.9%;
            --secondary-foreground: 0 0% 98%;
            --muted: 240 3.7% 15.9%;
            --muted-foreground: 240 5% 64.9%;
            --accent: 240 3.7% 15.9%;
            --accent-foreground: 0 0% 98%;
            --border: 240 3.7% 15.9%;
            --ring: 263.4 70% 50.4%;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: hsl(var(--card));
            border-radius: 12px;
            border: 1px solid hsl(var(--border));
            overflow: hidden;
        }
        .header {
            background: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            padding: 40px;
            text-align: center;
            border-bottom: 1px solid hsl(var(--border));
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 700; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .nav {
            background: hsl(var(--secondary));
            padding: 15px 40px;
            border-bottom: 1px solid hsl(var(--border));
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .nav a {
            color: hsl(var(--foreground));
            text-decoration: none;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 6px;
            transition: all 0.3s;
            border: 1px solid transparent;
        }
        .nav a:hover { 
            background: hsl(var(--accent)); 
            border-color: hsl(var(--border));
        }
        .content { padding: 40px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: hsl(var(--secondary));
            color: hsl(var(--foreground));
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid hsl(var(--border));
            transition: all 0.3s;
        }
        .stat-card:hover {
            border-color: hsl(var(--primary));
            box-shadow: 0 0 20px hsla(var(--primary), 0.3);
        }
        .stat-card .number { 
            font-size: 2.5em; 
            font-weight: bold; 
            margin: 10px 0;
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(263.4 70% 60%));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .stat-card .label { 
            font-size: 0.9em; 
            color: hsl(var(--muted-foreground));
            text-transform: uppercase; 
            letter-spacing: 1px; 
        }
        .section {
            margin-bottom: 40px;
            background: hsl(var(--secondary));
            padding: 30px;
            border-radius: 10px;
            border: 1px solid hsl(var(--border));
        }
        .section h2 {
            color: hsl(var(--foreground));
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid hsl(var(--primary));
            font-weight: 700;
        }
        .chart-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
            margin-top: 20px;
        }
        .chart-item {
            background: hsl(var(--card));
            padding: 20px;
            border-radius: 8px;
            border: 1px solid hsl(var(--border));
        }
        .chart-item h3 { 
            color: hsl(var(--foreground)); 
            margin-bottom: 15px;
            font-size: 1.1em;
            font-weight: 600;
        }
        .chart-item strong { color: hsl(var(--primary)); }
        .chart-item p { 
            color: hsl(var(--muted-foreground)); 
            margin: 8px 0;
        }
        .bar-container {
            width: 100%;
            margin: 8px 0;
        }
        .bar-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .bar-label {
            min-width: 120px;
            color: hsl(var(--foreground));
            font-size: 0.9em;
            font-weight: 500;
        }
        .bar-track {
            flex: 1;
            background: hsl(var(--muted));
            border-radius: 5px;
            height: 28px;
            position: relative;
            overflow: hidden;
        }
        .bar {
            background: linear-gradient(90deg, hsl(var(--primary)), hsl(263.4 70% 60%));
            height: 100%;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-weight: 600;
            font-size: 0.85em;
            transition: width 0.5s ease;
            min-width: 35px;
        }
        .note {
            background: hsl(var(--card));
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
            border: 1px solid hsl(var(--border));
            transition: all 0.3s;
        }
        .note:hover {
            border-color: hsl(var(--primary));
            box-shadow: 0 0 20px hsla(var(--primary), 0.2);
        }
        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }
        .note-title {
            color: hsl(var(--foreground));
            font-size: 1.8em;
            font-weight: 700;
            flex: 1;
            min-width: 300px;
        }
        .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .badge {
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 0.85em;
            font-weight: 600;
            display: inline-block;
            border: 1px solid transparent;
        }
        .badge-fav { background: hsl(45 93% 47%); color: hsl(0 0% 0%); }
        .badge-hidden { background: hsl(240 3.7% 25%); color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
        .badge-trash { background: hsl(0 72% 51%); color: white; }
        .badge-archived { background: hsl(199 89% 48%); color: white; }
        .badge-shared { background: hsl(142 71% 45%); color: white; }
        .badge-category { background: hsl(var(--primary)); color: white; }
        .note-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
            background: hsl(var(--secondary));
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid hsl(var(--border));
        }
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        .meta-label {
            font-size: 0.85em;
            color: hsl(var(--muted-foreground));
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .meta-value {
            color: hsl(var(--foreground));
            font-size: 0.95em;
            margin-top: 5px;
            font-weight: 500;
        }
        .note-body {
            color: hsl(var(--muted-foreground));
            line-height: 1.8;
            font-size: 1.05em;
        }
        .note-body h4 { 
            color: hsl(var(--foreground)); 
            margin: 20px 0 10px;
            font-weight: 600;
        }
        .note-body ul { margin-left: 20px; }
        .note-body li { margin: 5px 0; }
        .note-body strong { color: hsl(var(--foreground)); }
        .note-body p { margin: 10px 0; }
        .footer {
            background: hsl(var(--secondary));
            padding: 30px 40px;
            text-align: center;
            color: hsl(var(--muted-foreground));
            border-top: 1px solid hsl(var(--border));
        }
        .footer strong { color: hsl(var(--foreground)); }
        @media print {
            body { background: white; padding: 0; }
            .nav, .footer { display: none; }
            .note { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 My Notes Collection</h1>
            <p>Complete Export - Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="nav">
            <a href="#overview">📊 Overview</a>
            <a href="#analytics">📈 Analytics</a>
            <a href="#notes">📝 All Notes</a>
        </div>
        
        <div class="content">
            <section id="overview">
                <h2>📊 Overview</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="label">Total Notes</div>
                        <div class="number">${totalNotes}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Active</div>
                        <div class="number">${active}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Favorites</div>
                        <div class="number">${favorites}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Shared</div>
                        <div class="number">${shared}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Archived</div>
                        <div class="number">${archived}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Total Words</div>
                        <div class="number">${totalWords.toLocaleString()}</div>
                    </div>
                </div>
            </section>
            
            <section id="analytics" class="section">
                <h2>📈 Data Analytics</h2>
                
                <div class="chart-container">
                    <div class="chart-item">
                        <h3>📂 Categories (${Object.keys(categoryStats).length})</h3>
                        ${Object.entries(categoryStats)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, count]) => {
                            const percent = Math.round((count / totalNotes) * 100);
                            return `
                                <div class="bar-container">
                                    <div class="bar-wrapper">
                                        <div class="bar-label">${cat}</div>
                                        <div class="bar-track">
                                            <div class="bar" style="width: ${percent}%">${count}</div>
                                        </div>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                    
                    <div class="chart-item">
                        <h3>📅 Recent Activity (Last 10 Days)</h3>
                        ${sortedDates.slice(0, 10).map(([date, count]) => {
                            const maxCount = Math.max(...sortedDates.slice(0, 10).map(([_, c]) => c));
                            const percent = Math.round((count / maxCount) * 100);
                            return `
                            <div class="bar-container">
                                <div class="bar-wrapper">
                                    <div class="bar-label">${date}</div>
                                    <div class="bar-track">
                                        <div class="bar" style="width: ${Math.max(percent, 15)}%">${count}</div>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    
                    <div class="chart-item">
                        <h3>📊 Note Status Distribution</h3>
                        <div class="bar-container">
                            <div class="bar-wrapper">
                                <div class="bar-label">Active</div>
                                <div class="bar-track">
                                    <div class="bar" style="width: ${Math.max(Math.round((active / totalNotes) * 100), 15)}%">${active}</div>
                                </div>
                            </div>
                        </div>
                        <div class="bar-container">
                            <div class="bar-wrapper">
                                <div class="bar-label">Favorites</div>
                                <div class="bar-track">
                                    <div class="bar" style="width: ${Math.max(Math.round((favorites / totalNotes) * 100), 15)}%">${favorites}</div>
                                </div>
                            </div>
                        </div>
                        <div class="bar-container">
                            <div class="bar-wrapper">
                                <div class="bar-label">Archived</div>
                                <div class="bar-track">
                                    <div class="bar" style="width: ${Math.max(Math.round((archived / totalNotes) * 100), 15)}%">${archived}</div>
                                </div>
                            </div>
                        </div>
                        <div class="bar-container">
                            <div class="bar-wrapper">
                                <div class="bar-label">Trashed</div>
                                <div class="bar-track">
                                    <div class="bar" style="width: ${Math.max(Math.round((trashed / totalNotes) * 100), 15)}%">${trashed}</div>
                                </div>
                            </div>
                        </div>
                        <div class="bar-container">
                            <div class="bar-wrapper">
                                <div class="bar-label">Hidden</div>
                                <div class="bar-track">
                                    <div class="bar" style="width: ${Math.max(Math.round((hidden / totalNotes) * 100), 15)}%">${hidden}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-item">
                        <h3>📝 Content Statistics</h3>
                        <p><strong>Average words per note:</strong> ${avgWords}</p>
                        <p><strong>Total categories:</strong> ${Object.keys(categoryStats).length}</p>
                        <p><strong>Notes with content:</strong> ${data.filter(n => n.body && n.body.length > 0).length}</p>
                        <p><strong>Shared notes:</strong> ${shared} (${Math.round((shared / totalNotes) * 100)}%)</p>
                    </div>
                </div>
            </section>
            
            <section id="notes">
                <h2>📝 All Notes (${totalNotes})</h2>
                ${data.map((note, index) => `
                    <div class="note">
                        <div class="note-header">
                            <div class="note-title">${index + 1}. ${note.title || 'Untitled'}</div>
                            <div class="badges">
                                ${note.category ? `<span class="badge badge-category">${note.category}</span>` : ''}
                                ${note.fav ? '<span class="badge badge-fav">⭐ Favorite</span>' : ''}
                                ${note.hidden ? '<span class="badge badge-hidden">🔒 Hidden</span>' : ''}
                                ${note.trash ? '<span class="badge badge-trash">🗑️ Trashed</span>' : ''}
                                ${note.archived ? '<span class="badge badge-archived">📦 Archived</span>' : ''}
                                ${note.shareid ? '<span class="badge badge-shared">🔗 Shared</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="note-meta">
                            <div class="meta-item">
                                <span class="meta-label">ID</span>
                                <span class="meta-value">#${note.id}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Created</span>
                                <span class="meta-value">${note.created_at}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Last Updated</span>
                                <span class="meta-value">${note.lastupdated || 'Never'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">Word Count</span>
                                <span class="meta-value">${stripMarkdown(note.body).split(/\s+/).filter(w => w.length > 0).length} words</span>
                            </div>
                            ${note.shareid ? `
                            <div class="meta-item">
                                <span class="meta-label">Share ID</span>
                                <span class="meta-value">${note.shareid}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="note-body">
                            ${formatBodyForHtml(note.body || 'No content')}
                        </div>
                    </div>
                `).join('')}
            </section>
        </div>
        
        <div class="footer">
            <p><strong>📊 Export Summary</strong></p>
            <p>Total: ${totalNotes} notes | Active: ${active} | Favorites: ${favorites} | Total Words: ${totalWords.toLocaleString()}</p>
            <p style="margin-top: 10px; font-size: 0.9em;">Generated on ${new Date().toLocaleString()} | All data exported successfully</p>
        </div>
    </div>
</body>
</html>`;

                const blob = new Blob([html], { type: 'text/html' });
                downloadBlob(blob, 'notes.html');
        }
    }, []);

    const downloadBlob = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return { exportData };
}
