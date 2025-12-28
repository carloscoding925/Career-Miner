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
                -- Table Schemas
                CREATE SCHEMA IF NOT EXISTS public;
                CREATE SCHEMA IF NOT EXISTS data;

                CREATE TABLE IF NOT EXISTS data.scraped (
                    id serial PRIMARY KEY,
                    company text UNIQUE,
                    data jsonb NOT NULL DEFAULT '[]'::jsonb
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
