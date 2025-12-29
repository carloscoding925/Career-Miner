package com.career_miner.careerminer_api.models;

public enum Companies {
    BHE("Berkshire Hathaway Energy"),
    CITIZEN_HEALTH("Citizen Health"),
    CITADEL("Citadel"),
    JANE_STREET("Jane Street"),
    TWITCH("Twitch"),
    PGE("Pacific Gas & Electric"),
    SCE("Southern California Edison"),
    AMAE_HEALTH("Amae Health"),
    ITS("ITS Logistics"),
    AFFIRM("Affirm");

    private final String text;

    Companies(String text) {
        this.text = text;
    }

    public String asText() {
        return this.text;
    }

    public static Companies fromText(String text) {
        for (Companies company : Companies.values()) {
            if (company.text.equals(text)) {
                return company;
            }
        }

        throw new IllegalArgumentException("Unknown Company: " + text);
    }
}
