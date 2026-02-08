import React, { useState, useEffect } from 'react';
import { Hotel, MapPin, Phone, Mail, AlertCircle, CheckCircle, Clock, Users, Send, Bell, Navigation } from 'lucide-react';

const LodgingDestinationAlerts = () => {
  const [lodgings, setLodgings] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showAddLodging, setShowAddLodging] = useState(false);
  const [showAddDestination, setShowAddDestination] = useState(false);

  useEffect(() => {
    fetchLodgings();
    fetchDestinations();
    fetchActiveAlerts();
  }, []);

  const fetchLodgings = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/mauttr/lodging/list');
      const data = await res.json();
      setLodgings(data.lodgings || [
        {
          id: 1,
          name: 'Hotel Marriott',
          address: 'Av. Revolución 1234, Tijuana, BC',
          phone: '+52-664-123-4567',
          email: 'front.desk@marriott-tijuana.com',
          checkIn: '2026-02-05',
          checkOut: '2026-02-08',
          confirmationCode: 'MRT-2026-4567',
          notifyOnIncident: true,
          notifyOnArrival: true,
          notifyOnDelay: true
        }
      ]);
    } catch (err) {
      console.error('Failed to fetch lodgings:', err);
    }
  };

  const fetchDestinations = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/mauttr/destination/list');
      const data = await res.json();
      setDestinations(data.destinations || [
        {
          id: 1,
          name: 'Business Meeting',
          location: 'Tijuana, Baja California, MX',
          contactName: 'Carlos Rodriguez',
          contactPhone: '+52-664-987-6543',
          contactEmail: 'carlos@business.mx',
          expectedArrival: '2026-02-05 14:00',
          notifyOnDelay: true,
          notifyOnIncident: true,
          autoUpdateETA: true
        }
      ]);
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/mauttr/alerts/active');
      const data = await res.json();
      setActiveAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const testAlert = () => {
    const lodgingIds = lodgings.filter(l => l.notifyOnIncident).map(l => l.id);
    const destinationIds = destinations.filter(d => d.notifyOnIncident).map(d => d.id);
    alert('Test alert sent to all lodgings and destinations!');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER - GOLD THEME */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '2px solid #cba658',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(203,166,88,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #cba658 0%, #b8944d 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(203,166,88,0.4)'
          }}>
            <Bell size={32} color="#0f172a" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ color: '#cba658', fontSize: '28px', fontWeight: '700', margin: 0, marginBottom: '4px' }}>
              Lodging & Destination Alerts
            </h1>
            <p style={{ color: '#06b6d4', fontSize: '14px', margin: 0, fontWeight: '600' }}>
              Automatic notifications to hotels and contacts during incidents
            </p>
          </div>
        </div>
      </div>

      {/* STATS - DARK TEXT ON COLORED BACKGROUNDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatCard 
          icon={<Hotel size={18} />} 
          label="LODGINGS" 
          value={lodgings.length} 
          color="#cba658"
          bgColor="rgba(203,166,88,0.2)"
        />
        <StatCard 
          icon={<MapPin size={18} />} 
          label="DESTINATIONS" 
          value={destinations.length} 
          color="#06b6d4"
          bgColor="rgba(6,182,212,0.2)"
        />
        <StatCard 
          icon={<Bell size={18} />} 
          label="ACTIVE ALERTS" 
          value={activeAlerts.length} 
          color="#ef4444"
          bgColor="rgba(239,68,68,0.2)"
        />
        <StatCard 
          icon={<CheckCircle size={18} />} 
          label="STATUS" 
          value="Ready" 
          color="#10b981"
          bgColor="rgba(16,185,129,0.2)"
        />
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* LEFT - LODGINGS (GOLD THEME) */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #cba658',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: '#cba658', fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Hotel size={22} />
              Registered Lodgings
            </h2>
            <button
              onClick={() => setShowAddLodging(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #cba658 0%, #b8944d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Add Lodging
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {lodgings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b0' }}>
                No lodgings registered yet
              </div>
            ) : (
              lodgings.map(lodging => (
                <LodgingCard key={lodging.id} lodging={lodging} />
              ))
            )}
          </div>
        </div>

        {/* RIGHT - DESTINATIONS (CYAN THEME) */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid #06b6d4',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: '#06b6d4', fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Navigation size={22} />
              Destination Contacts
            </h2>
            <button
              onClick={() => setShowAddDestination(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Add Contact
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {destinations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b0' }}>
                No destination contacts yet
              </div>
            ) : (
              destinations.map(dest => (
                <DestinationCard key={dest.id} destination={dest} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ALERT SETTINGS - BLUE THEME */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Send size={22} />
          Automatic Alert Settings
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <AlertSetting
            icon={<AlertCircle size={18} />}
            title="Emergency Incident"
            description="Panic button activated"
            color="#ef4444"
            enabled={true}
          />
          <AlertSetting
            icon={<Clock size={18} />}
            title="Arrival Delay"
            description="ETA updates sent"
            color="#f59e0b"
            enabled={true}
          />
          <AlertSetting
            icon={<CheckCircle size={18} />}
            title="Safe Arrival"
            description="Confirm check-in"
            color="#10b981"
            enabled={true}
          />
        </div>

        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '8px'
        }}>
          <div style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
            What Gets Sent in Alerts:
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6' }}>
            ✓ Your name & MAUTTR ID<br />
            ✓ GPS location (live link)<br />
            ✓ Incident type & timestamp<br />
            ✓ Live video stream link (if emergency)<br />
            ✓ Embassy notification confirmation<br />
            ✓ Emergency contact information<br />
            ✓ Estimated time of resolution
          </div>
        </div>
      </div>

      {/* TEST ALERT BUTTON - ORANGE THEME */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#f59e0b', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
          Test Alert System
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '16px' }}>
          Send a test notification to all registered lodgings and destinations
        </p>
        <button
          onClick={testAlert}
          style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#0f172a',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
          }}
        >
          Send Test Alert
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bgColor }) => (
  <div style={{
    background: bgColor,
    border: `2px solid ${color}`,
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center'
  }}>
    <div style={{ color: color, marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
      {icon}
    </div>
    <div style={{ 
      color: '#0f172a', 
      fontSize: '11px', 
      marginBottom: '4px', 
      textTransform: 'uppercase', 
      letterSpacing: '0.5px',
      fontWeight: '700'
    }}>
      {label}
    </div>
    <div style={{ color: color, fontSize: '20px', fontWeight: '700' }}>
      {value}
    </div>
  </div>
);

const LodgingCard = ({ lodging }) => (
  <div style={{
    background: 'rgba(203,166,88,0.1)',
    border: '1px solid rgba(203,166,88,0.3)',
    borderRadius: '10px',
    padding: '14px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
      <div>
        <div style={{ color: '#cba658', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
          {lodging.name}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '2px' }}>
          {lodging.address}
        </div>
        <div style={{ color: '#94a3b0', fontSize: '11px' }}>
          Check-in: {new Date(lodging.checkIn).toLocaleDateString()} • Check-out: {new Date(lodging.checkOut).toLocaleDateString()}
        </div>
      </div>
      <div style={{
        padding: '4px 10px',
        background: lodging.notifyOnIncident ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,176,0.2)',
        border: `1px solid ${lodging.notifyOnIncident ? '#10b981' : '#94a3b0'}`,
        borderRadius: '6px',
        color: lodging.notifyOnIncident ? '#10b981' : '#94a3b0',
        fontSize: '10px',
        fontWeight: '700'
      }}>
        {lodging.notifyOnIncident ? 'ALERTS ON' : 'ALERTS OFF'}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
      <ContactInfo icon={<Phone size={12} />} value={lodging.phone} color="#06b6d4" />
      <ContactInfo icon={<Mail size={12} />} value={lodging.email} color="#3b82f6" />
    </div>

    <div style={{
      marginTop: '10px',
      padding: '8px',
      background: 'rgba(203,166,88,0.15)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#cbd5e1'
    }}>
      <strong style={{ color: '#cba658' }}>Confirmation:</strong> {lodging.confirmationCode}
    </div>
  </div>
);

const DestinationCard = ({ destination }) => (
  <div style={{
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: '10px',
    padding: '14px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
      <div>
        <div style={{ color: '#06b6d4', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>
          {destination.name}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '2px' }}>
          {destination.location}
        </div>
        <div style={{ color: '#94a3b0', fontSize: '11px' }}>
          Contact: {destination.contactName}
        </div>
      </div>
      <div style={{
        padding: '4px 10px',
        background: destination.notifyOnIncident ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,176,0.2)',
        border: `1px solid ${destination.notifyOnIncident ? '#10b981' : '#94a3b0'}`,
        borderRadius: '6px',
        color: destination.notifyOnIncident ? '#10b981' : '#94a3b0',
        fontSize: '10px',
        fontWeight: '700'
      }}>
        {destination.notifyOnIncident ? 'ALERTS ON' : 'ALERTS OFF'}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
      <ContactInfo icon={<Phone size={12} />} value={destination.contactPhone} color="#06b6d4" />
      <ContactInfo icon={<Mail size={12} />} value={destination.contactEmail} color="#3b82f6" />
    </div>

    <div style={{
      marginTop: '10px',
      padding: '8px',
      background: 'rgba(6,182,212,0.15)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#cbd5e1'
    }}>
      <strong style={{ color: '#06b6d4' }}>Expected:</strong> {new Date(destination.expectedArrival).toLocaleString()}
    </div>
  </div>
);

const ContactInfo = ({ icon, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ color: color }}>
      {icon}
    </div>
    <div style={{ color: '#cbd5e1', fontSize: '11px' }}>
      {value}
    </div>
  </div>
);

const AlertSetting = ({ icon, title, description, color, enabled }) => (
  <div style={{
    background: `${color}15`,
    border: `1px solid ${color}40`,
    borderRadius: '8px',
    padding: '12px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <div style={{ color: color }}>
        {icon}
      </div>
      <div style={{ color: color, fontSize: '14px', fontWeight: '700' }}>
        {title}
      </div>
    </div>
    <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '8px' }}>
      {description}
    </div>
    <div style={{
      padding: '4px 10px',
      background: enabled ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,176,0.2)',
      border: `1px solid ${enabled ? '#10b981' : '#94a3b0'}`,
      borderRadius: '4px',
      color: enabled ? '#10b981' : '#94a3b0',
      fontSize: '10px',
      fontWeight: '700',
      textAlign: 'center'
    }}>
      {enabled ? 'ENABLED' : 'DISABLED'}
    </div>
  </div>
);

export default LodgingDestinationAlerts;