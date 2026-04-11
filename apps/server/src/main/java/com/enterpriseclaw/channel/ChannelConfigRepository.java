package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChannelConfigRepository extends JpaRepository<ChannelConfig, String> {

    List<ChannelConfig> findByEnabledTrue();

    List<ChannelConfig> findByChannelType(ChannelType channelType);
}
