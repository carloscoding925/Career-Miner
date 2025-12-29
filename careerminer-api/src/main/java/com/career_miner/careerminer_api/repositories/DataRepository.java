package com.career_miner.careerminer_api.repositories;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Repository;

import com.career_miner.careerminer_api.models.Companies;

@Repository
public class DataRepository extends BaseRepository {
    private static final Logger logger = LogManager.getLogger(DataRepository.class);

    public DataRepository() {
        logger.info("Initializing Data Repository");
    }

    public boolean insertScrapedData(Companies company, String data) {
        String insertSQL = 
            """
                INSERT INTO data.postings (company_id, data)
                VALUES((SELECT id FROM company.companies WHERE name = ?), ?);
            """;
        try (Connection connection = dataSource.getConnection(); PreparedStatement statement = connection.prepareStatement(insertSQL)) {
            statement.setString(1, company.asText());
            statement.setObject(2, data, Types.OTHER);
            logger.info(statement.toString());

            int results = statement.executeUpdate();
            if (results == 0) {
                logger.warn("SQL Insertion Failed");
                return false;
            }

            return true;
        } catch (Exception ex) {
            logger.error("Caught Exception: " + ex);
            return false;
        }
    }
}
