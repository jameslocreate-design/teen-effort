# Project Architecture Rules

- Let Capacitor resize the iOS web view for the software keyboard; never add keyboard height to page or safe-area padding, because that double-resizes the interface.