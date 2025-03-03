// pages/index.js
import { useState, useEffect } from 'react';
import { supabase } from './_app';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const matches = [
    { date: '02/03/2025', time: '22:00', home: 'Sao Paulo', away: 'Bragantino' },
    { date: '03/03/2025', time: '16:00', home: 'Esteghlal FC', away: 'Al-Nassr' },
    { date: '03/03/2025', time: '19:30', home: 'Nottingham Forest', away: 'Ipswich Town' },
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchLeaderboard();
    };
    getUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLeaderboard();
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleRegister = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert('Registration failed: ' + error.message);
    } else {
      alert('Registration successful! Check your email to confirm.');
      setIsRegistering(false);
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      setUser(data.user);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Logout failed: ' + error.message);
    } else {
      setUser(null);
      setPredictions({});
      setLeaderboard([]);
    }
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
      home_goals: parseInt(predictions[index]?.home) || 0,
      away_goals: parseInt(predictions[index]?.away) || 0,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('predictions')
      .insert(predictionData);

    if (error) {
      alert('Error saving predictions: ' + error.message);
    } else {
      alert('Predictions saved successfully!');
      fetchLeaderboard();
    }
  };

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching leaderboard:', error);
    } else {
      setLeaderboard(data || []);
    }
  };

  return (
    <div className={styles.container}>
      {!user ? (
        <div>
          <h2>{isRegistering ? 'Register' : 'Login'}</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isRegistering ? (
            <button onClick={handleRegister}>Register</button>
          ) : (
            <button onClick={handleLogin}>Login</button>
          )}
          <button onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Switch to Login' : 'Switch to Register'}
          </button>
        </div>
      ) : (
        <>
          <h2>Football Predictions</h2>
          <p>Welcome, {user.email} <button onClick={handleLogout}>Logout</button></p>

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
              {leaderboard.length > 0 ? (
                leaderboard.map((pred, index) => (
                  <tr key={index}>
                    <td>{pred.user_id.slice(0, 8)}</td>
                    <td>{pred.home_team} vs {pred.away_team}</td>
                    <td>{pred.home_goals} - {pred.away_goals}</td>
                    <td>{new Date(pred.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No predictions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}