// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import Balance from './components/Balance';
import AddTransactionForm from './components/AddTransactionForm';
import TransactionTable from './components/TransactionTable';
import IncomeExpenseChart from './components/IncomeExpenseChart';
import MonthlySummary from './components/MonthlySummary';
import CSVExport from './components/CSVExport';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Switch,
  styled,
  CssBaseline,
  // Remove the Slide import since it's unused
} from '@mui/material';

const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </ThemeProvider>
  );
};

const ThemedApp = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentTranslations } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);

  const loadInitialCapital = () => {
    const storedCapital = localStorage.getItem('initialCapital');
    return storedCapital ? parseFloat(storedCapital) : 7440.6;
  };

  const loadTransactions = () => {
    const storedTransactions = localStorage.getItem('transactions');
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  };

  const loadRecurringTransactions = () => {
    const storedRecurringTransactions = localStorage.getItem('recurringTransactions');
    return storedRecurringTransactions ? JSON.parse(storedRecurringTransactions) : [];
  };

  const [initialCapital, setInitialCapital] = useState(loadInitialCapital());
  const [transactions, setTransactions] = useState(loadTransactions());
  const [recurringTransactions, setRecurringTransactions] = useState(loadRecurringTransactions());
  const [filterCriteria, setFilterCriteria] = useState({});
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('initialCapital', initialCapital);
  }, [initialCapital]);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e); // Save the event for triggering later
      setDialogOpen(true); // Open the dialog when the event is captured
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (isIOS()) {
      setIsIosPromptVisible(true);
    }
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
        setDialogOpen(false); // Close the dialog after user interaction
      });
    }
  };

  const handleCloseIosPrompt = () => {
    setIsIosPromptVisible(false);
  };

  const addTransaction = (transaction) => {
    const newTransaction = {
      ...transaction,
      id: transactions.length + 1,
      date: new Date().toISOString().split('T')[0], // Automatically set the current date
      timestamp: new Date().toLocaleString(), // Add timestamp here
    };

    if (transaction.isRecurring) {
      setRecurringTransactions((prevRecurring) => {
        const newRecurring = [...prevRecurring, newTransaction];
        localStorage.setItem('recurringTransactions', JSON.stringify(newRecurring));
        return newRecurring;
      });
    }

    setTransactions((prevTransactions) => {
      const updatedTransactions = [...prevTransactions, newTransaction];
      localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      return updatedTransactions;
    });

    toast.success(currentTranslations.transactionAdded);
  };

  // Use useCallback to memoize the processRecurringTransactions function
  const processRecurringTransactions = useCallback(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentDay = currentDate.getDate();

    const newTransactions = recurringTransactions
      .filter((recTransaction) => recTransaction.recurringDay === currentDay)
      .map((recTransaction) => ({
        ...recTransaction,
        date: new Date(currentYear, currentMonth, currentDay).toISOString().split('T')[0],
        id: transactions.length + 1, // Ensure unique ID for new transactions
      }));

    if (newTransactions.length > 0) {
      setTransactions((prevTransactions) => {
        const updatedTransactions = [...prevTransactions, ...newTransactions];
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        return updatedTransactions;
      });
      toast.info('Recurring transactions processed for today.');
    }
  }, [recurringTransactions, transactions]);

  // Process recurring transactions once every day
  useEffect(() => {
    const currentDate = new Date();
    const storedLastProcessed = localStorage.getItem('lastProcessedDate');
    const lastProcessedDate = storedLastProcessed ? new Date(storedLastProcessed) : null;

    if (!lastProcessedDate || lastProcessedDate.getDate() !== currentDate.getDate()) {
      processRecurringTransactions();
      localStorage.setItem('lastProcessedDate', currentDate.toISOString());
    }
  }, [processRecurringTransactions]);

  const editTransaction = (updatedTransaction) => {
    setTransactions(
      transactions.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
  };

  const deleteTransaction = (id) => {
    if (window.confirm(currentTranslations.deleteConfirmation)) {
      setTransactions(transactions.filter((transaction) => transaction.id !== id));
      setRecurringTransactions(recurringTransactions.filter((transaction) => transaction.id !== id));
      toast.info(currentTranslations.transactionDeleted);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const dateMatch =
      (!filterCriteria.startDate || new Date(transaction.date) >= new Date(filterCriteria.startDate)) &&
      (!filterCriteria.endDate || new Date(transaction.date) <= new Date(filterCriteria.endDate));
    const categoryMatch = !filterCriteria.category || transaction.category === filterCriteria.category;
    const typeMatch = !filterCriteria.type || transaction.type === filterCriteria.type;
    return dateMatch && categoryMatch && typeMatch;
  });

  // Define the custom switch
  const FuturisticSwitch = styled(Switch)(({ theme }) => ({
    width: 62,
    height: 34,
    padding: 7,
    '& .MuiSwitch-switchBase': {
      margin: 1,
      padding: 0,
      transform: 'translateX(6px)',
      '&.Mui-checked': {
        color: '#fff',
        transform: 'translateX(22px)',
        '& .MuiSwitch-thumb:before': {
          content: "'☀️'",
          position: 'absolute',
          top: 8,
          left: 6,
          fontSize: 14,
        },
        '& + .MuiSwitch-track': {
          backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
          opacity: 1,
          border: 0,
        },
      },
    },
    '& .MuiSwitch-thumb': {
      backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
      width: 32,
      height: 32,
      '&:before': {
        content: "'🌙'",
        position: 'absolute',
        top: 8,
        left: 8,
        fontSize: 14,
      },
    },
    '& .MuiSwitch-track': {
      borderRadius: 20 / 2,
      backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
      opacity: 1,
      transition: theme.transitions.create(['background-color'], {
        duration: 500,
      }),
    },
  }));

  // Function to handle closing the dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  // Function to handle opening the clear confirmation dialog
  const handleClearAllData = () => {
    setClearDialogOpen(true);
  };

  // Function to confirm clearing all transactions
  const confirmClearAllData = () => {
    setTransactions([]); // Clear transactions from state
    setRecurringTransactions([]); // Clear recurring transactions from state
    setInitialCapital(0); // Reset initial capital
    localStorage.removeItem('transactions'); // Remove transactions from local storage
    localStorage.removeItem('recurringTransactions'); // Remove recurring transactions from local storage
    localStorage.removeItem('initialCapital'); // Remove initial capital from local storage
    toast.info('All transactions and data have been cleared.');
    setClearDialogOpen(false); // Close the confirmation dialog
  };

  // Function to cancel clearing data
  const cancelClearAllData = () => {
    setClearDialogOpen(false);
  };

  // Function to check if the device is iOS
  const isIOS = () => {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  };

  // Define a common button style
  const commonButtonStyle = {
    minWidth: 160,
    height: 40,
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5 }}>
      <CssBaseline />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <AppBar position="static" color="primary">
        <Toolbar sx={{ flexWrap: 'wrap' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {currentTranslations.financeTracker}
          </Typography>
          <LanguageSwitcher sx={{ mr: 2 }} />
          <FuturisticSwitch
            checked={theme === 'dark'}
            onChange={toggleTheme}
            inputProps={{ 'aria-label': 'toggle theme' }}
            sx={{ mr: 2 }}
          />
        </Toolbar>
      </AppBar>

      {/* Adding space below the AppBar */}
      <Box sx={{ my: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Balance
              transactions={transactions}
              initialCapital={initialCapital}
              updateInitialCapital={setInitialCapital}
            />
            <AddTransactionForm addTransaction={addTransaction} setFilterCriteria={setFilterCriteria} />
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Grid item>
                <CSVExport transactions={transactions} sx={commonButtonStyle} />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleClearAllData} // Open the confirmation dialog
                  sx={commonButtonStyle}
                >
                  Clear All Data
                </Button>
              </Grid>
            </Grid>
            <TransactionTable
              transactions={filteredTransactions}
              editTransaction={editTransaction}
              deleteTransaction={deleteTransaction}
            />
            <MonthlySummary transactions={transactions} />
          </Grid>
          <Grid item xs={12} md={4}>
            <IncomeExpenseChart transactions={transactions} />
          </Grid>
        </Grid>
      </Box>

      {/* Clear All Data Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={cancelClearAllData}
        aria-labelledby="clear-data-dialog-title"
        aria-describedby="clear-data-dialog-description"
      >
        <DialogTitle id="clear-data-dialog-title">
          {'Are you sure you want to clear all data?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="clear-data-dialog-description">
            This action will delete all transactions and reset your balance to zero. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelClearAllData} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmClearAllData} color="error">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Prompt Dialog with Full-Screen Effect */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="install-dialog-title"
        aria-describedby="install-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="install-dialog-title">{'Install Web App'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="install-dialog-description">
            Would you like to install this web app for a better experience?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleInstallClick} color="primary" autoFocus>
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* iOS Instructions Dialog */}
      <Dialog
        open={isIosPromptVisible}
        onClose={handleCloseIosPrompt}
        aria-labelledby="ios-instructions-title"
        aria-describedby="ios-instructions-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="ios-instructions-title">{'Add to Home Screen'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="ios-instructions-description">
            To add this app to your home screen, tap the "Share" icon in the Safari browser and select "Add to Home Screen".
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIosPrompt} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default App;
