// Tournament export utilities for results and statistics

import type { Tournament, Team } from '../types/tournament';
import type { Match } from '../types/match';
import type { TournamentStandings } from '../types/bracket';
import { StandingsCalculator } from './standingsCalculator';
import { MatchStatus } from '../types/enums';

export interface ExportOptions {
  includeMatches: boolean;
  includeStandings: boolean;
  includeStatistics: boolean;
  includeTeamDetails: boolean;
  format: 'json' | 'csv';
}

export interface TournamentExportData {
  tournament: Tournament;
  standings?: TournamentStandings[];
  statistics?: TournamentStatistics;
  matches?: Match[];
  exportedAt: Date;
  version: string;
}

export interface TournamentStatistics {
  totalMatches: number;
  completedMatches: number;
  totalStones: number;
  averageStonesPerMatch: number;
  highestScoringMatch?: {
    match: Match;
    totalStones: number;
  };
  mostLopsidedMatch?: {
    match: Match;
    margin: number;
  };
  teamStats: {
    [teamId: string]: {
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      stonesFor: number;
      stonesAgainst: number;
      averageStonesFor: number;
      averageStonesAgainst: number;
      winPercentage: number;
      form: ('W' | 'L' | 'D')[];
    };
  };
}

export class TournamentExporter {
  /**
   * Export tournament data in the specified format
   */
  static async exportTournament(
    tournament: Tournament,
    matches: Match[],
    options: ExportOptions
  ): Promise<string> {
    const exportData = this.prepareExportData(tournament, matches, options);
    
    switch (options.format) {
      case 'json':
        return this.exportAsJSON(exportData);
      case 'csv':
        return this.exportAsCSV(exportData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Prepare tournament data for export
   */
  private static prepareExportData(
    tournament: Tournament,
    matches: Match[],
    options: ExportOptions
  ): TournamentExportData {
    const tournamentMatches = matches.filter(match => match.tournamentId === tournament.id);
    
    const exportData: TournamentExportData = {
      tournament: {
        ...tournament,
        teams: options.includeTeamDetails ? tournament.teams : tournament.teams.map(team => ({
          ...team,
          players: [], // Exclude player details for privacy
          stats: team.stats
        }))
      },
      exportedAt: new Date(),
      version: '1.0.0'
    };

    if (options.includeMatches) {
      exportData.matches = tournamentMatches;
    }

    if (options.includeStandings) {
      exportData.standings = StandingsCalculator.calculateStandings(
        tournament.teams,
        tournamentMatches
      );
    }

    if (options.includeStatistics) {
      exportData.statistics = this.calculateDetailedStatistics(
        tournament.teams,
        tournamentMatches
      );
    }

    return exportData;
  }

  /**
   * Export data as JSON
   */
  private static exportAsJSON(data: TournamentExportData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data as CSV
   */
  private static exportAsCSV(data: TournamentExportData, options: ExportOptions): string {
    let csvContent = '';

    // Tournament header
    csvContent += `Tournament: ${data.tournament.name}\n`;
    csvContent += `Format: ${data.tournament.format}\n`;
    csvContent += `Exported: ${data.exportedAt.toISOString()}\n\n`;

    // Standings
    if (options.includeStandings && data.standings) {
      csvContent += 'STANDINGS\n';
      csvContent += 'Position,Team,Matches Played,Wins,Losses,Stones For,Stones Against,Stone Difference,Win %,Points\n';
      
      data.standings.forEach(standing => {
        csvContent += [
          standing.position,
          `"${standing.team.name}"`,
          standing.matchesPlayed,
          standing.matchesWon,
          standing.matchesLost,
          standing.stonesFor,
          standing.stonesAgainst,
          standing.stoneDifference,
          (standing.winPercentage * 100).toFixed(1),
          standing.points
        ].join(',') + '\n';
      });
      csvContent += '\n';
    }

    // Matches
    if (options.includeMatches && data.matches) {
      csvContent += 'MATCHES\n';
      csvContent += 'Date,Home Team,Away Team,Home Score,Away Score,Status,Duration,Stones\n';
      
      data.matches.forEach(match => {
        const duration = match.completedAt && match.createdAt 
          ? Math.round((new Date(match.completedAt).getTime() - new Date(match.createdAt).getTime()) / 1000 / 60)
          : '';
        
        csvContent += [
          match.createdAt ? new Date(match.createdAt).toLocaleDateString() : '',
          `"${match.homeTeam.name}"`,
          `"${match.awayTeam.name}"`,
          match.score.home,
          match.score.away,
          match.status,
          duration ? `${duration} min` : '',
          match.timer.stones
        ].join(',') + '\n';
      });
      csvContent += '\n';
    }

    // Statistics
    if (options.includeStatistics && data.statistics) {
      csvContent += 'STATISTICS\n';
      csvContent += `Total Matches: ${data.statistics.totalMatches}\n`;
      csvContent += `Completed Matches: ${data.statistics.completedMatches}\n`;
      csvContent += `Total Stones: ${data.statistics.totalStones}\n`;
      csvContent += `Average Stones per Match: ${data.statistics.averageStonesPerMatch.toFixed(1)}\n`;
      
      if (data.statistics.highestScoringMatch) {
        const match = data.statistics.highestScoringMatch.match;
        csvContent += `Highest Scoring Match: "${match.homeTeam.name} vs ${match.awayTeam.name}" (${data.statistics.highestScoringMatch.totalStones} stones)\n`;
      }
      
      if (data.statistics.mostLopsidedMatch) {
        const match = data.statistics.mostLopsidedMatch.match;
        csvContent += `Most Lopsided Match: "${match.homeTeam.name} vs ${match.awayTeam.name}" (${data.statistics.mostLopsidedMatch.margin} stone margin)\n`;
      }
    }

    return csvContent;
  }

  /**
   * Calculate detailed tournament statistics
   */
  private static calculateDetailedStatistics(
    teams: Team[],
    matches: Match[]
  ): TournamentStatistics {
    const completedMatches = matches.filter(match => match.status === MatchStatus.COMPLETED);
    const totalMatches = matches.length;
    
    let totalStones = 0;
    let highestScoringMatch: { match: Match; totalStones: number } | undefined;
    let mostLopsidedMatch: { match: Match; margin: number } | undefined;
    let highestTotalScore = 0;
    let largestMargin = 0;

    // Calculate match statistics
    completedMatches.forEach(match => {
      const matchTotal = match.score.home + match.score.away;
      const margin = Math.abs(match.score.home - match.score.away);
      
      totalStones += matchTotal;
      
      if (matchTotal > highestTotalScore) {
        highestTotalScore = matchTotal;
        highestScoringMatch = { match, totalStones: matchTotal };
      }
      
      if (margin > largestMargin) {
        largestMargin = margin;
        mostLopsidedMatch = { match, margin };
      }
    });

    // Calculate team statistics
    const teamStats: TournamentStatistics['teamStats'] = {};
    
    teams.forEach(team => {
      const teamMatches = completedMatches.filter(match => 
        match.homeTeam.id === team.id || match.awayTeam.id === team.id
      );

      let matchesWon = 0;
      let matchesLost = 0;
      let stonesFor = 0;
      let stonesAgainst = 0;

      teamMatches.forEach(match => {
        const isHome = match.homeTeam.id === team.id;
        const teamScore = isHome ? match.score.home : match.score.away;
        const opponentScore = isHome ? match.score.away : match.score.home;

        stonesFor += teamScore;
        stonesAgainst += opponentScore;

        if (teamScore > opponentScore) {
          matchesWon++;
        } else if (teamScore < opponentScore) {
          matchesLost++;
        }
      });

      const form = StandingsCalculator.getTeamForm(team, matches, 5);

      teamStats[team.id] = {
        matchesPlayed: teamMatches.length,
        matchesWon,
        matchesLost,
        stonesFor,
        stonesAgainst,
        averageStonesFor: teamMatches.length > 0 ? stonesFor / teamMatches.length : 0,
        averageStonesAgainst: teamMatches.length > 0 ? stonesAgainst / teamMatches.length : 0,
        winPercentage: teamMatches.length > 0 ? matchesWon / teamMatches.length : 0,
        form
      };
    });

    return {
      totalMatches,
      completedMatches: completedMatches.length,
      totalStones,
      averageStonesPerMatch: completedMatches.length > 0 ? totalStones / completedMatches.length : 0,
      highestScoringMatch,
      mostLopsidedMatch,
      teamStats
    };
  }

  /**
   * Generate printable bracket HTML
   */
  static generatePrintableBracket(tournament: Tournament, matches: Match[]): string {
    const standings = StandingsCalculator.calculateStandings(tournament.teams, matches);
    const statistics = this.calculateDetailedStatistics(tournament.teams, matches);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tournament.name} - Tournament Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .tournament-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .standings { margin-bottom: 30px; }
        .standings table { width: 100%; border-collapse: collapse; }
        .standings th, .standings td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .standings th { background-color: #f2f2f2; }
        .matches { margin-bottom: 30px; }
        .match { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        .match-teams { font-weight: bold; font-size: 1.1em; }
        .match-score { font-size: 1.2em; color: #333; }
        .statistics { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${tournament.name}</h1>
        <p>Tournament Results - ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="tournament-info">
        <h2>Tournament Information</h2>
        <p><strong>Format:</strong> ${tournament.format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
        <p><strong>Teams:</strong> ${tournament.teams.length}</p>
        <p><strong>Matches:</strong> ${statistics.completedMatches}/${statistics.totalMatches}</p>
        ${tournament.description ? `<p><strong>Description:</strong> ${tournament.description}</p>` : ''}
    </div>

    <div class="standings">
        <h2>Final Standings</h2>
        <table>
            <thead>
                <tr>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>MP</th>
                    <th>W</th>
                    <th>L</th>
                    <th>SF</th>
                    <th>SA</th>
                    <th>SD</th>
                    <th>Win%</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map(standing => `
                    <tr>
                        <td>${standing.position}</td>
                        <td>${standing.team.name}</td>
                        <td>${standing.matchesPlayed}</td>
                        <td>${standing.matchesWon}</td>
                        <td>${standing.matchesLost}</td>
                        <td>${standing.stonesFor}</td>
                        <td>${standing.stonesAgainst}</td>
                        <td>${standing.stoneDifference > 0 ? '+' : ''}${standing.stoneDifference}</td>
                        <td>${(standing.winPercentage * 100).toFixed(1)}%</td>
                        <td>${standing.points}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="matches">
        <h2>Match Results</h2>
        ${matches.filter(m => m.status === MatchStatus.COMPLETED).map(match => `
            <div class="match">
                <div class="match-teams">${match.homeTeam.name} vs ${match.awayTeam.name}</div>
                <div class="match-score">${match.score.home} - ${match.score.away}</div>
                <div class="match-info">
                    ${match.completedAt ? `Completed: ${new Date(match.completedAt).toLocaleString()}` : ''}
                </div>
            </div>
        `).join('')}
    </div>

    <div class="statistics">
        <h2>Tournament Statistics</h2>
        <p><strong>Total Stones Scored:</strong> ${statistics.totalStones}</p>
        <p><strong>Average Stones per Match:</strong> ${statistics.averageStonesPerMatch.toFixed(1)}</p>
        ${statistics.highestScoringMatch ? `
            <p><strong>Highest Scoring Match:</strong> ${statistics.highestScoringMatch.match.homeTeam.name} vs ${statistics.highestScoringMatch.match.awayTeam.name} (${statistics.highestScoringMatch.totalStones} stones)</p>
        ` : ''}
        ${statistics.mostLopsidedMatch ? `
            <p><strong>Most Lopsided Match:</strong> ${statistics.mostLopsidedMatch.match.homeTeam.name} vs ${statistics.mostLopsidedMatch.match.awayTeam.name} (${statistics.mostLopsidedMatch.margin} stone margin)</p>
        ` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Download file with given content
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for export
   */
  static generateFilename(tournament: Tournament, format: string): string {
    const date = new Date().toISOString().split('T')[0];
    const safeName = tournament.name.replace(/[^a-zA-Z0-9]/g, '_');
    return `${safeName}_${date}.${format}`;
  }
}