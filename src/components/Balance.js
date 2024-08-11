// src/components/Balance.js
import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { Card, CardContent, Typography, TextField, Button, Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { FaBars } from 'react-icons/fa'; // Import the hamburger icon
import StyledIconWrapper from './StyledIconWrapper'; // Import the styled wrapper

const Balance = ({ transactions, initialCapital, updateInitialCapital }) => {
  const { language } = useLanguage();
  const [newBalance, setNewBalance] = useState(initialCapital);
  const [showUpdateSection, setShowUpdateSection] = useState(false); // State to toggle the update section
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Check if the screen is small

  const translations = {
    en: {
      currentBalance: 'Current Balance',
      setNewBalance: 'Set new balance',
      updateBalance: 'Update Balance',
    },
    ru: {
      currentBalance: 'Текущий баланс',
      setNewBalance: 'Установить новый баланс',
      updateBalance: 'Обновить баланс',
    },
    he: {
      currentBalance: 'יתרה נוכחית',
      setNewBalance: 'הגדר יתרה חדשה',
      updateBalance: 'עדכן יתרה',
    },
  };

  const balance = transactions.reduce((acc, transaction) => {
    return transaction.type === 'Income'
      ? acc + transaction.amount
      : transaction.type === 'Expense'
      ? acc - transaction.amount
      : acc; // 'Other' transactions don't affect the balance
  }, newBalance);

  const handleBalanceChange = (e) => {
    setNewBalance(parseFloat(e.target.value));
  };

  const updateBalance = () => {
    updateInitialCapital(newBalance);
  };

  // Toggle the visibility of the update section
  const toggleUpdateSection = () => {
    setShowUpdateSection((prev) => !prev);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant={isMobile ? 'h6' : 'h5'} component="h5" gutterBottom>
            {translations[language].currentBalance}: ₪{balance.toFixed(2)}
          </Typography>
          <IconButton onClick={toggleUpdateSection} sx={{ ml: 2, mt: isMobile ? -0.5 : 0 }}>
            <StyledIconWrapper>
              <FaBars />
            </StyledIconWrapper>
          </IconButton>
        </Box>
        {showUpdateSection && (
          <Box
            component="form"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 2, // Add some margin-top for spacing
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              type="number"
              label={translations[language].setNewBalance}
              value={newBalance}
              onChange={handleBalanceChange}
              fullWidth
              size={isMobile ? 'small' : 'medium'}
            />
            <Button variant="outlined" onClick={updateBalance} size={isMobile ? 'small' : 'medium'}>
              {translations[language].updateBalance}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default Balance;
