'use client';

import React, { useMemo } from 'react';
import type { Bracket, BracketNode, TournamentStandings } from '../types/bracket';
import type { Team } from '../types/tournament';
import { TournamentFormat } from '../types/enums';

interface BracketVisualizationProps {
  bracket: Bracket;
  onMatchClick?: (matchId: string) => void;
  showStandings?: boolean;
  standings?: TournamentStandings[];
}

export const BracketVisualization: React.FC<BracketVisualizationProps> = ({
  bracket,
  onMatchClick,
  showStandings = false,
  standings = []
}) => {
  const isRoundRobin = bracket.format === TournamentFormat.ROUND_ROBIN;

  if (isRoundRobin) {
    return (
      <div className="bracket-container">
        <RoundRobinView bracket={bracket} onMatchClick={onMatchClick} />
        {showStandings && standings.length > 0 && (
          <StandingsTable standings={standings} />
        )}
      </div>
    );
  }

  return (
    <div className="bracket-container">
      <EliminationBracketView bracket={bracket} onMatchClick={onMatchClick} />
      {bracket.thirdPlaceMatch && (
        <ThirdPlaceMatch match={bracket.thirdPlaceMatch} onMatchClick={onMatchClick} />
      )}
    </div>
  );
};

interface EliminationBracketViewProps {
  bracket: Bracket;
  onMatchClick?: (matchId: string) => void;
}

const EliminationBracketView: React.FC<EliminationBracketViewProps> = ({
  bracket,
  onMatchClick
}) => {
  return (
    <div className="elimination-bracket">
      <div className="bracket-rounds">
        {bracket.rounds.map((round) => (
          <div key={round.round} className="bracket-round">
            <h3 className="round-title">{round.name}</h3>
            <div className="round-matches">
              {round.matches.map((match) => (
                <BracketMatch
                  key={match.id}
                  match={match}
                  onClick={onMatchClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RoundRobinViewProps {
  bracket: Bracket;
  onMatchClick?: (matchId: string) => void;
}

const RoundRobinView: React.FC<RoundRobinViewProps> = ({
  bracket,
  onMatchClick
}) => {
  return (
    <div className="round-robin-bracket">
      {bracket.rounds.map((round) => (
        <div key={round.round} className="round-robin-round">
          <h3 className="round-title">{round.name}</h3>
          <div className="round-matches">
            {round.matches.map((match) => (
              <BracketMatch
                key={match.id}
                match={match}
                onClick={onMatchClick}
                compact
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface BracketMatchProps {
  match: BracketNode;
  onClick?: (matchId: string) => void;
  compact?: boolean;
}

const BracketMatch: React.FC<BracketMatchProps> = ({
  match,
  onClick,
  compact = false
}) => {
  const handleClick = () => {
    if (match.match?.id && onClick) {
      onClick(match.match.id);
    }
  };

  const isClickable = match.match?.id && onClick;
  const hasWinner = !!match.winner;
  const isComplete = match.match?.status === 'completed';

  return (
    <div
      className={`bracket-match ${compact ? 'compact' : ''} ${
        isClickable ? 'clickable' : ''
      } ${isComplete ? 'completed' : ''}`}
      onClick={handleClick}
    >
      <div className="match-teams">
        <TeamSlot
          team={match.team1}
          isWinner={hasWinner && match.winner?.id === match.team1?.id}
          score={match.match?.score?.home}
        />
        <div className="match-vs">vs</div>
        <TeamSlot
          team={match.team2}
          isWinner={hasWinner && match.winner?.id === match.team2?.id}
          score={match.match?.score?.away}
        />
      </div>
      
      {match.match && (
        <div className="match-info">
          <span className="match-status">
            {match.match.status === 'completed' ? 'Final' : 
             match.match.status === 'active' ? 'Live' :
             match.match.status === 'pending' ? 'Scheduled' : 
             match.match.status}
          </span>
          {match.match.completedAt && (
            <span className="match-time">
              {new Date(match.match.completedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface TeamSlotProps {
  team?: Team;
  isWinner?: boolean;
  score?: number;
}

const TeamSlot: React.FC<TeamSlotProps> = ({ team, isWinner, score }) => {
  if (!team) {
    return (
      <div className="team-slot empty">
        <span className="team-name">TBD</span>
      </div>
    );
  }

  return (
    <div className={`team-slot ${isWinner ? 'winner' : ''}`}>
      <div className="team-info">
        <div 
          className="team-color" 
          style={{ backgroundColor: team.color }}
        />
        <span className="team-name">{team.shortName || team.name}</span>
      </div>
      {typeof score === 'number' && (
        <span className="team-score">{score}</span>
      )}
    </div>
  );
};

interface ThirdPlaceMatchProps {
  match: BracketNode;
  onMatchClick?: (matchId: string) => void;
}

const ThirdPlaceMatch: React.FC<ThirdPlaceMatchProps> = ({
  match,
  onMatchClick
}) => {
  return (
    <div className="third-place-match">
      <h3>Third Place Match</h3>
      <BracketMatch match={match} onClick={onMatchClick} />
    </div>
  );
};

interface StandingsTableProps {
  standings: TournamentStandings[];
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  return (
    <div className="standings-table">
      <h3>Tournament Standings</h3>
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
          {standings.map((standing) => (
            <tr key={standing.team.id}>
              <td className="position">{standing.position}</td>
              <td className="team">
                <div className="team-info">
                  <div 
                    className="team-color" 
                    style={{ backgroundColor: standing.team.color }}
                  />
                  <span>{standing.team.name}</span>
                </div>
              </td>
              <td>{standing.matchesPlayed}</td>
              <td>{standing.matchesWon}</td>
              <td>{standing.matchesLost}</td>
              <td>{standing.stonesFor}</td>
              <td>{standing.stonesAgainst}</td>
              <td className={standing.stoneDifference >= 0 ? 'positive' : 'negative'}>
                {standing.stoneDifference > 0 ? '+' : ''}{standing.stoneDifference}
              </td>
              <td>{(standing.winPercentage * 100).toFixed(1)}%</td>
              <td className="points">{standing.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BracketVisualization;