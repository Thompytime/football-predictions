// pages/index.js
import { useState, useEffect } from 'react';
import { supabase } from './_app';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPredictions, setUserPredictions] = useState([]);
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
      if (user) {
        fetchLeaderboard();
        fetchUserPredictions();
      }
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchLeaderboard();
        fetchUserPredictions();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleRegister = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) alert('Registration failed: ' + error.message);
    else alert('Registration successful! Check your email to confirm.');
    setIsRegistering(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login failed: ' + error.message);
    else setUser(data.user);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Logout failed: ' + error.message);
    else {
      setUser(null);
      setPredictions({});
      setLeaderboard([]);
      setUserPredictions([]);
    }
  };

  const handlePredictionChange = (matchIndex, team, value) => {
    setPredictions(prev => ({
      ...prev,
      [matchIndex]: { ...prev[matchIndex], [team]: value },
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
    const { error } = await supabase.from('predictions').insert(predictionData);
    if (error) alert('Error saving predictions: ' + error.message);
    else {
      alert('Predictions saved successfully!');
      setPredictions({});
      fetchLeaderboard();
      fetchUserPredictions();
    }
  };

  const fetchLeaderboard = async () => {
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('user_id, home_team, away_team, home_goals, away_goals');
    const { data: results, error: resError } = await supabase
      .from('results')
      .select('home_team, away_team, home_goals, away_goals');

    if (predError || resError) {
      console.error('Fetch error:', predError || resError);
      return;
    }

    const pointsByUser = {};
    predictions.forEach(pred => {
      const result = results.find(
        r => r.home_team === pred.home_team && r.away_team === pred.away_team
      );
      const userId = pred.user_id;
      if (!pointsByUser[userId]) pointsByUser[userId] = { points: 0, email: '' };

      if (result) {
        const predDiff = pred.home_goals - pred.away_goals;
        const resultDiff = result.home_goals - result.away_goals;
        if (pred.home_goals === result.home_goals && pred.away_goals === result.away_goals) {
          pointsByUser[userId].points += 5;
        } else if (
          (predDiff > 0 && resultDiff > 0) ||
          (predDiff < 0 && resultDiff < 0) ||
          (predDiff === 0 && resultDiff === 0)
        ) {
          pointsByUser[userId].points += 2;
        }
      }
    });

    // Fetch user emails
    const userIds = Object.keys(pointsByUser);
    const { data: users, error: userError } = await supabase
      .from('predictions')
      .select('user_id')
      .in('user_id', userIds)
      .limit(1, { per: 'user_id' }); // Get distinct users
    if (userError) console.error('User fetch error:', userError);

    const emailPromises = userIds.map(async (id) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(id);
      return { id, email: authUser?.user?.email || id.slice(0, 8) };
    });
    const userEmails = await Promise.all(emailPromises);
    userEmails.forEach(({ id, email }) => {
      if (pointsByUser[id]) pointsByUser[id].email = email;
    });

    const leaderboardData = Object.entries(pointsByUser)
      .map(([userId, { points, email }]) => ({ user_id: userId, email, points }))
      .sort((a, b) => b.points - a.points);

    setLeaderboard(leaderboardData);
  };

  const fetchUserPredictions = async () => {
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('user_id, home_team, away_team, home_goals, away_goals, created_at')
      .order('created_at', { ascending: false });
    const { data: results, error: resError } = await supabase
      .from('results')
      .select('home_team, away_team, home_goals, away_goals');

    if (predError || resError) {
      console.error('Fetch error:', predError || resError);
      return;
    }

    const predictionData = predictions.map(pred => {
      const result = results.find(
        r => r.home_team === pred.home_team && r.away_team === pred.away_team
      );
      let points = 0;
      if (result) {
        const predDiff = pred.home_goals - pred.away_goals;
        const resultDiff = result.home_goals - result.away_goals;
        if (pred.home_goals === result.home_goals && pred.away_goals === result.away_goals) {
          points = 5;
        } else if (
          (predDiff > 0 && resultDiff > 0) ||
          (predDiff < 0 && resultDiff < 0) ||
          (predDiff === 0 && resultDiff === 0)
        ) {
          points = 2;
        }
      }
      return {
        user_id: pred.user_id,
        match: `${pred.home_team} vs ${pred.away_team}`,
        prediction: `${pred.home_goals} - ${pred.away_goals}`,
        result: result ? `${result.home_goals} - ${result.away_goals}` : 'N/A',
        points,
        date: new Date(pred.created_at).toLocaleString(),
      };
    });

    setUserPredictions(predictionData);
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

          <h3>Predictions</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Match</th>
                <th>Prediction</th>
                <th>Result</th>
                <th>Points</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {userPredictions.length > 0 ? (
                userPredictions.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.user_id.slice(0, 8)}</td>
                    <td>{entry.match}</td>
                    <td>{entry.prediction}</td>
                    <td>{entry.result}</td>
                    <td>{entry.points}</td>
                    <td>{entry.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No predictions yet</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>Leaderboard</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.email}</td>
                    <td>{entry.points}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">No scores yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}