#!/bin/bash

# Wait for SQL Server to start
echo "Waiting for SQL Server to start..."
sleep 30s

# Run the initialization script
echo "Running database initialization script..."
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -C -i /docker-entrypoint-initdb.d/init.sql

echo "Database initialization completed!"
