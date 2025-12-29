package com.career_miner.careerminer_api.utils;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.career_miner.careerminer_api.repositories.BaseRepository;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

public class DatabaseUtil {
    private static final Logger logger = LogManager.getLogger(DatabaseUtil.class);
    private static DatabaseUtil instance;
    private HikariDataSource dataSource;
    
    private DatabaseUtil() {
        logger.info("Creating Hikari Config");

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("JDBC_URI"));

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(1);

        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);

        config.setPoolName("CareerMiner Pool");
        config.setConnectionTestQuery("SELECT 1");
        config.setLeakDetectionThreshold(60000);

        config.setAutoCommit(true);
        config.setKeepaliveTime(60000);

        dataSource = new HikariDataSource(config);

        try {
            BaseRepository.createDatabaseSchema(dataSource);
        } catch (Exception ex) {
            logger.error("Caught Exception: " + ex);
        }
    }

    public static synchronized DatabaseUtil getInstance() {
        if (instance == null) {
            instance = new DatabaseUtil();
        }

        return instance;
    }

    public HikariDataSource getDataSource() {
        return dataSource;
    }
}
