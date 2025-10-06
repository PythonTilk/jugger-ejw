'use client';

import React, { useState } from 'react';
import { TournamentExporter, type ExportOptions } from '../utils/tournamentExporter';
import type { Tournament } from '../types/tournament';
import type { Match } from '../types/match';
import { useLanguage } from '../contexts';

interface TournamentExportProps {
  tournament: Tournament;
  matches: Match[];
  onClose?: () => void;
}

export const TournamentExport: React.FC<TournamentExportProps> = ({
  tournament,
  matches,
  onClose
}) => {
  const { t } = useLanguage();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMatches: true,
    includeStandings: true,
    includeStatistics: true,
    includeTeamDetails: false,
    format: 'json'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleOptionChange = (key: keyof ExportOptions, value: boolean | string) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
    setExportError(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const tournamentMatches = matches.filter(match => match.tournamentId === tournament.id);
      const content = await TournamentExporter.exportTournament(
        tournament,
        tournamentMatches,
        exportOptions
      );

      const filename = TournamentExporter.generateFilename(tournament, exportOptions.format);
      const mimeType = exportOptions.format === 'json' 
        ? 'application/json' 
        : 'text/csv';

      TournamentExporter.downloadFile(content, filename, mimeType);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintableExport = () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const tournamentMatches = matches.filter(match => match.tournamentId === tournament.id);
      const htmlContent = TournamentExporter.generatePrintableBracket(tournament, tournamentMatches);
      
      const filename = TournamentExporter.generateFilename(tournament, 'html');
      TournamentExporter.downloadFile(htmlContent, filename, 'text/html');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const tournamentMatches = matches.filter(match => match.tournamentId === tournament.id);
    const htmlContent = TournamentExporter.generatePrintableBracket(tournament, tournamentMatches);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="tournament-export">
      <div className="export-header">
        <h3>{t('tournament.export')} - {tournament.name}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="close-button"
            aria-label={t('ui.close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {exportError && (
        <div className="export-error">
          <p>{exportError}</p>
        </div>
      )}

      <div className="export-options">
        <h4>Export Options</h4>
        
        <div className="option-section">
          <h5>Format</h5>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportOptions.format === 'json'}
                onChange={(e) => handleOptionChange('format', e.target.value)}
              />
              JSON (Complete Data)
            </label>
            <label>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportOptions.format === 'csv'}
                onChange={(e) => handleOptionChange('format', e.target.value)}
              />
              CSV (Spreadsheet Compatible)
            </label>
          </div>
        </div>

        <div className="option-section">
          <h5>Include Data</h5>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includeMatches}
                onChange={(e) => handleOptionChange('includeMatches', e.target.checked)}
              />
              {t('tournament.matches')} & Results
            </label>
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includeStandings}
                onChange={(e) => handleOptionChange('includeStandings', e.target.checked)}
              />
              {t('tournament.standings')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includeStatistics}
                onChange={(e) => handleOptionChange('includeStatistics', e.target.checked)}
              />
              Tournament Statistics
            </label>
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includeTeamDetails}
                onChange={(e) => handleOptionChange('includeTeamDetails', e.target.checked)}
              />
              Detailed Team Information
            </label>
          </div>
        </div>
      </div>

      <div className="export-actions">
        <div className="action-group">
          <h5>Data Export</h5>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn btn-primary"
          >
            {isExporting ? 'Exporting...' : `Export as ${exportOptions.format.toUpperCase()}`}
          </button>
        </div>

        <div className="action-group">
          <h5>Printable Results</h5>
          <div className="button-row">
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              Print Results
            </button>
            <button
              onClick={handlePrintableExport}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              Download HTML
            </button>
          </div>
        </div>
      </div>

      <div className="export-preview">
        <h4>Export Preview</h4>
        <div className="preview-info">
          <div className="info-item">
            <span className="label">Tournament:</span>
            <span className="value">{tournament.name}</span>
          </div>
          <div className="info-item">
            <span className="label">Format:</span>
            <span className="value">
              {tournament.format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Teams:</span>
            <span className="value">{tournament.teams.length}</span>
          </div>
          <div className="info-item">
            <span className="label">Matches:</span>
            <span className="value">
              {matches.filter(m => m.tournamentId === tournament.id).length}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Completed:</span>
            <span className="value">
              {matches.filter(m => m.tournamentId === tournament.id && m.status === 'completed').length}
            </span>
          </div>
        </div>

        <div className="included-data">
          <h5>Included in Export:</h5>
          <ul>
            <li className={exportOptions.includeMatches ? 'included' : 'excluded'}>
              Match results and details
            </li>
            <li className={exportOptions.includeStandings ? 'included' : 'excluded'}>
              Tournament standings
            </li>
            <li className={exportOptions.includeStatistics ? 'included' : 'excluded'}>
              Tournament statistics
            </li>
            <li className={exportOptions.includeTeamDetails ? 'included' : 'excluded'}>
              Team and player details
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TournamentExport;