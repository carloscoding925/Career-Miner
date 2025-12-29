package com.career_miner.careerminer_api.repositories;

import java.sql.Connection;
import java.sql.PreparedStatement;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;

import com.career_miner.careerminer_api.utils.DatabaseUtil;
import com.zaxxer.hikari.HikariDataSource;

public abstract class Repository implements AutoCloseable {
    private static final Logger logger = LogManager.getLogger(Repository.class);
    public HikariDataSource dataSource;
    
    @Autowired
    protected Repository() {
        logger.info("Initializing Database Schema");
        DatabaseUtil databaseInstance = DatabaseUtil.getInstance();
        dataSource = databaseInstance.getDataSource();
    }

    public static void createDatabaseSchema(HikariDataSource dataSource) {
        String createDatabaseSQL = 
            """
                -- Schemas
                CREATE SCHEMA IF NOT EXISTS public;
                CREATE SCHEMA IF NOT EXISTS company;
                CREATE SCHEMA IF NOT EXISTS data;

                -- Company Tables
                CREATE TABLE IF NOT EXISTS company.companies (
                    id serial PRIMARY KEY,
                    name text UNIQUE
                );
                INSERT INTO company.companies (name) VALUES
                    ('Berkshire Hathaway Energy'), ('Citizen Health'), ('Citadel'), ('Jane Street'), ('Twitch'),
                    ('Pacific Gas & Electric'), ('Southern California Edison'), ('Amae Health'), ('ITS Logistics'),
                    ('Affirm')
                ON CONFLICT DO NOTHING;

                -- Data Tables
                CREATE TABLE IF NOT EXISTS data.postings (
                    company_id serial PRIMARY KEY,
                    data jsonb NOT NULL DEFAULT '[]'::jsonb,
                    created_date timestamp without time zone NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS data.usage (
                    company_id serial PRIMARY KEY,
                    data jsonb NOT NULL DEFAULT '[]'::jsonb,
                    created_date timestamp without time zone NOT NULL DEFAULT NOW()
                );
            """;
        try (Connection connection = dataSource.getConnection(); PreparedStatement statement = connection.prepareStatement(createDatabaseSQL)) {
            statement.execute();
        } catch (Exception ex) {
            logger.error("Caught Exception: " + ex);
        }
    }

    public void close() {
        dataSource.close();
    }
}
