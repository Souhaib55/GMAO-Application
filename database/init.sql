-- GMAO Database Initialization Script
-- This script will be executed when SQL Server container starts

USE master;
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'gmao')
BEGIN
    CREATE DATABASE gmao;
    PRINT 'Database gmao created successfully.';
END
ELSE
BEGIN
    PRINT 'Database gmao already exists.';
END
GO

PRINT 'Database initialization script completed.';
PRINT 'The application will create tables automatically using Entity Framework migrations.';
GO
