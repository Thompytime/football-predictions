// pages/index.js
import { useState, useEffect } from 'react';
import { supabase } from './_app'; // Import from _app.js
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);

  const matches = [
    { date: '02/03/2025', time: '22:00', home: 'Sao Paulo', away: 'Bragantino' },
    { date: '03/03/2025', time: '16:00', home: 'Esteghlal FC', away: 'Al-Nassr' },
    { date: '03/03/2025', time: '19:30', home: 'Nottingham Forest', away: 'Ipswich Town' },
  ];

  useEffect(() => {
    // Check if user is logged in
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchLeaderboard();
    };
    getUser();
  }, []);

  const handleLogin = async () => {
    const email = prompt('Enter your email');
    const password = prompt('Enter your password');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data.user) setUser(data.user);
    if (error) alert('Login failed');
  };

  const handlePredictionChange = (matchIndex, team, value) => {
    setPredictions(prev => ({
      ...prev,
      [matchIndex]: {
        ...prev[matchIndex],
        [team]: value,
      },
    }));
  };

  const submitPredictions = async () => {
    if (!user) {
      alert('Please login first');
      return;
    }

    const predictionData = matches.map((match, index) => ({
      user_id: user.id,
      match_date: match.date,
      home_team: match.home,
      away_team: match.away,
      home_goals: predictions[index]?.home || 0,
      away_goals: predictions[index]?.away || 0,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('predictions')
      .insert(predictionData);

    if (error) {
      alert('Error saving predictions');
    } else {
      alert('Predictions saved successfully!');
      fetchLeaderboard();
    }
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false });
    setLeaderboard(data || []);
  };

  return (
    <div className={styles.container}>
      <h2>Football Predictions</h2>
      {!user && <button onClick={handleLogin}>Login</button>}
      {user && <p>Welcome, {user.email}</p>}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Home Team</th>
            <th>Home Goals</th>
            <th>Away Team</th>
            <th>Away Goals</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => (
            <tr key={index}>
              <td>{match.date}</td>
              <td>{match.time}</td>
              <td>{match.home}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={predictions[index]?.home || ''}
                  onChange={(e) => handlePredictionChange(index, 'home', e.target.value)}
                />
              </td>
              <td>{match.away}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={predictions[index]?.away || ''}
                  onChange={(e) => handlePredictionChange(index, 'away', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={submitPredictions}>Submit Predictions</button>

      <h3>Leaderboard</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Match</th>
            <th>Prediction</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((pred, index) => (
            <tr key={index}>
              <td>{pred.user_id.slice(0, 8)}</td>
              <td>{pred.home_team} vs {pred.away_team}</td>
              <td>{pred.home_goals} - {pred.away_goals}</td>
              <td>{new Date(pred.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}